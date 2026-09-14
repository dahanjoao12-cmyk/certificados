import type { SupabaseClient } from "@supabase/supabase-js";
import { detectDocumentType, normalizeDocument, validateDocument } from "@/lib/documents/document";
import { parseFlexibleDate } from "./date";
import type { ImportRowResult } from "@/lib/types/database";

export interface ImportRowOutcome {
  rowNumber: number;
  raw: Record<string, string>;
  result: ImportRowResult;
  message: string | null;
  companyId: string | null;
  certificateId: string | null;
}

export interface ImportSummary {
  totalRows: number;
  companiesCreated: number;
  companiesUpdated: number;
  certificatesCreated: number;
  duplicates: number;
  conflicts: number;
  errors: number;
  rows: ImportRowOutcome[];
}

interface CompanyCacheEntry {
  id: string;
  code: string;
  document_type: "cnpj" | "cpf";
  isNewInBatch: boolean;
  fields: Record<string, string | null>;
}

interface ProcessContext {
  supabase: SupabaseClient;
  dryRun: boolean;
  userId: string;
  companyByDocument: Map<string, CompanyCacheEntry>;
  companyByCode: Map<string, string>; // code -> normalized document, to catch in-batch code conflicts
  maxValidToByCompany: Map<string, string | null>;
}

const COMPANY_FIELD_KEYS = [
  "code",
  "corporate_name",
  "trade_name",
  "short_name",
  "municipality",
  "uf",
  "responsible",
  "phone",
  "email",
  "situation",
  "notes",
] as const;

function mapRow(raw: Record<string, string>, mapping: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [header, target] of Object.entries(mapping)) {
    if (!target) continue;
    const value = raw[header];
    if (value !== undefined && value !== "") mapped[target] = value.trim();
  }
  return mapped;
}

async function loadExistingCompany(ctx: ProcessContext, normalizedDocument: string) {
  const { data } = await ctx.supabase
    .from("companies")
    .select("id, code, document_type, corporate_name, trade_name, short_name, municipality, uf, responsible, phone, email, situation, notes")
    .eq("document", normalizedDocument)
    .maybeSingle();
  return data;
}

async function loadMaxValidTo(ctx: ProcessContext, companyId: string): Promise<string | null> {
  const { data } = await ctx.supabase
    .from("certificates")
    .select("valid_to")
    .eq("company_id", companyId)
    .order("valid_to", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.valid_to ?? null;
}

async function certificateExists(ctx: ProcessContext, companyId: string, validTo: string): Promise<boolean> {
  const { data } = await ctx.supabase
    .from("certificates")
    .select("id")
    .eq("company_id", companyId)
    .eq("valid_to", validTo)
    .maybeSingle();
  return Boolean(data);
}

async function processRow(
  ctx: ProcessContext,
  rowNumber: number,
  raw: Record<string, string>,
  mapping: Record<string, string>
): Promise<ImportRowOutcome> {
  const mapped = mapRow(raw, mapping);
  const outcome = (result: ImportRowResult, message: string | null, companyId: string | null = null, certificateId: string | null = null): ImportRowOutcome => ({
    rowNumber,
    raw,
    result,
    message,
    companyId,
    certificateId,
  });

  const documentRaw = mapped.document;
  if (!documentRaw) {
    return outcome("error", "CNPJ/CPF não informado.");
  }

  const validation = validateDocument(documentRaw);
  if (!validation.valid || !validation.type) {
    return outcome("error", `CNPJ/CPF inválido: ${documentRaw}`);
  }
  const normalizedDocument = validation.normalized;

  let entry = ctx.companyByDocument.get(normalizedDocument);
  let companyResult: ImportRowResult | null = null;
  let companyMessage: string | null = null;

  if (!entry) {
    const existing = await loadExistingCompany(ctx, normalizedDocument);
    if (existing) {
      entry = {
        id: existing.id,
        code: existing.code,
        document_type: existing.document_type,
        isNewInBatch: false,
        fields: {
          corporate_name: existing.corporate_name,
          trade_name: existing.trade_name,
          short_name: existing.short_name,
          municipality: existing.municipality,
          uf: existing.uf,
          responsible: existing.responsible,
          phone: existing.phone,
          email: existing.email,
          situation: existing.situation,
          notes: existing.notes,
        },
      };
      ctx.companyByDocument.set(normalizedDocument, entry);
      ctx.companyByCode.set(existing.code, normalizedDocument);
    }
  }

  if (!entry) {
    // New company. Requires at least a name and a code.
    const name = mapped.corporate_name || mapped.short_name;
    if (!name || !mapped.code) {
      return outcome("error", "Empresa nova requer ao menos código e razão social/nome.");
    }
    const conflictingDocument = ctx.companyByCode.get(mapped.code);
    if (conflictingDocument && conflictingDocument !== normalizedDocument) {
      return outcome("conflict", `Código ${mapped.code} já utilizado por outro CNPJ/CPF nesta importação.`);
    }

    const documentType = validation.type;
    let newId = `pending:${normalizedDocument}`;

    if (!ctx.dryRun) {
      const { data: inserted, error } = await ctx.supabase
        .from("companies")
        .insert({
          code: mapped.code,
          document: normalizedDocument,
          document_type: documentType,
          corporate_name: mapped.corporate_name || name,
          trade_name: mapped.trade_name || null,
          short_name: mapped.short_name || null,
          municipality: mapped.municipality || null,
          uf: mapped.uf ? mapped.uf.toUpperCase() : null,
          responsible: mapped.responsible || null,
          phone: mapped.phone || null,
          email: mapped.email || null,
          situation: mapped.situation || null,
          notes: mapped.notes || null,
          origin: "import",
          created_by: ctx.userId,
          updated_by: ctx.userId,
        })
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          return outcome("conflict", `Já existe empresa com o código ${mapped.code} ou este CNPJ/CPF.`);
        }
        return outcome("error", `Falha ao criar empresa: ${error.message}`);
      }
      newId = inserted.id;
    }

    entry = {
      id: newId,
      code: mapped.code,
      document_type: documentType,
      isNewInBatch: true,
      fields: { corporate_name: mapped.corporate_name || name },
    };
    ctx.companyByDocument.set(normalizedDocument, entry);
    ctx.companyByCode.set(mapped.code, normalizedDocument);
    companyResult = "company_created";
    companyMessage = `Empresa criada (código ${mapped.code}).`;
  } else {
    // Existing (or already-created-in-batch) company: apply safe updates, flag code conflicts.
    if (mapped.code && mapped.code !== entry.code) {
      companyResult = "conflict";
      companyMessage = `Código informado (${mapped.code}) difere do código já cadastrado (${entry.code}). Mantido o código existente.`;
    }

    const updates: Record<string, string | null> = {};
    for (const key of COMPANY_FIELD_KEYS) {
      if (key === "code") continue;
      const value = mapped[key];
      if (value && value !== entry.fields[key]) {
        updates[key] = key === "uf" ? value.toUpperCase() : value;
      }
    }

    if (Object.keys(updates).length > 0 && !entry.isNewInBatch) {
      if (!ctx.dryRun) {
        await ctx.supabase.from("companies").update({ ...updates, updated_by: ctx.userId }).eq("id", entry.id);
      }
      entry.fields = { ...entry.fields, ...updates };
      if (companyResult !== "conflict") {
        companyResult = "company_updated";
        companyMessage = `Campos atualizados: ${Object.keys(updates).join(", ")}.`;
      }
    }
  }

  // Certificate (optional per row)
  let certificateId: string | null = null;
  let certResult: ImportRowResult | null = null;
  let certMessage: string | null = null;

  const validToRaw = mapped.valid_to;
  if (validToRaw) {
    const validTo = parseFlexibleDate(validToRaw);
    if (!validTo) {
      certResult = "error";
      certMessage = `Data de vencimento inválida: ${validToRaw}`;
    } else if (entry.isNewInBatch && entry.id.startsWith("pending:")) {
      // dry run only: company itself wasn't really created, so we can't create a real certificate row.
      certResult = "certificate_created";
      certMessage = `Certificado seria criado com vencimento ${validTo}.`;
    } else {
      if (!ctx.maxValidToByCompany.has(entry.id)) {
        ctx.maxValidToByCompany.set(entry.id, entry.isNewInBatch ? null : await loadMaxValidTo(ctx, entry.id));
      }
      const currentMax = ctx.maxValidToByCompany.get(entry.id) ?? null;

      const alreadyExists = ctx.dryRun
        ? false
        : await certificateExists(ctx, entry.id, validTo);

      if (alreadyExists) {
        certResult = "duplicate";
        certMessage = `Certificado com vencimento ${validTo} já cadastrado para esta empresa.`;
      } else {
        const isNewCurrent = !currentMax || validTo >= currentMax;
        const certType = mapped.cert_type === "e-cnpj" || mapped.cert_type === "e-cpf"
          ? mapped.cert_type
          : entry.document_type === "cnpj"
            ? "e-cnpj"
            : "e-cpf";
        const certModel = mapped.cert_model === "A1" || mapped.cert_model === "A3" ? mapped.cert_model : "A1";
        const validFrom = mapped.valid_from ? parseFlexibleDate(mapped.valid_from) : null;

        if (!ctx.dryRun) {
          const { data: inserted, error } = await ctx.supabase
            .from("certificates")
            .insert({
              company_id: entry.id,
              type: certType,
              model: certModel,
              valid_from: validFrom,
              valid_to: validTo,
              certificate_authority: mapped.certificate_authority || null,
              serial_number: mapped.serial_number || null,
              is_current: isNewCurrent,
              origin: "import",
              created_by: ctx.userId,
            })
            .select("id")
            .single();

          if (error) {
            certResult = "error";
            certMessage = `Falha ao criar certificado: ${error.message}`;
          } else {
            certificateId = inserted.id;
            await ctx.supabase.from("certificate_history").insert({
              certificate_id: inserted.id,
              company_id: entry.id,
              action: isNewCurrent && currentMax ? "renewed" : "created",
              field_changed: isNewCurrent && currentMax ? "valid_to" : null,
              old_value: isNewCurrent ? currentMax : null,
              new_value: validTo,
              changed_by: ctx.userId,
            });
          }
        }

        if (!certResult) {
          certResult = "certificate_created";
          certMessage = `Certificado cadastrado (vencimento ${validTo}).`;
        }
        if (isNewCurrent) ctx.maxValidToByCompany.set(entry.id, validTo);
      }
    }
  }

  // A row can touch both company and certificate; pick the most significant
  // result to store, but keep both messages.
  const finalResult: ImportRowResult =
    companyResult === "conflict"
      ? "conflict"
      : certResult === "error"
        ? "error"
        : certResult ?? companyResult ?? "skipped";

  const finalMessage = [companyMessage, certMessage].filter(Boolean).join(" ") || null;

  return outcome(finalResult, finalMessage, entry.id.startsWith("pending:") ? null : entry.id, certificateId);
}

export async function processImportRows(
  supabase: SupabaseClient,
  rawRows: Record<string, string>[],
  mapping: Record<string, string>,
  userId: string,
  dryRun: boolean
): Promise<ImportSummary> {
  const ctx: ProcessContext = {
    supabase,
    dryRun,
    userId,
    companyByDocument: new Map(),
    companyByCode: new Map(),
    maxValidToByCompany: new Map(),
  };

  const rows: ImportRowOutcome[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    rows.push(await processRow(ctx, i + 2, rawRows[i], mapping));
  }

  const summary: ImportSummary = {
    totalRows: rawRows.length,
    companiesCreated: rows.filter((r) => r.result === "company_created").length,
    companiesUpdated: rows.filter((r) => r.result === "company_updated").length,
    certificatesCreated: rows.filter((r) => r.result === "certificate_created").length,
    duplicates: rows.filter((r) => r.result === "duplicate").length,
    conflicts: rows.filter((r) => r.result === "conflict").length,
    errors: rows.filter((r) => r.result === "error").length,
    rows,
  };

  return summary;
}

export { normalizeDocument, detectDocumentType };
