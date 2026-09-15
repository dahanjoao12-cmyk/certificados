import type { SupabaseClient } from "@supabase/supabase-js";
import { detectDocumentType, normalizeDocument, validateDocument } from "@/lib/documents/document";
import { parseFlexibleDate } from "./date";
import type { ImportRowResult } from "@/lib/types/database";

/** How the user chose to resolve a per-row conflict (section: resolução de conflito de importação). */
export type RowResolution = "keep_existing" | "use_imported";

export interface RowConflictDetails {
  field: "code";
  existingValue: string;
  importedValue: string;
}

export interface ImportRowOutcome {
  rowNumber: number;
  raw: Record<string, string>;
  /** Combined, display-priority result for this row (conflict > error > cert outcome > company outcome). A row can affect BOTH a company and a certificate -- use companyOutcome/certOutcome, not this field, for aggregate counts. */
  result: ImportRowResult;
  message: string | null;
  companyId: string | null;
  certificateId: string | null;
  /** The company-side outcome alone (null if the row didn't touch a company beyond an existing untouched match). */
  companyOutcome: ImportRowResult | null;
  /** The certificate-side outcome alone (null if the row had no valid_to to process). */
  certOutcome: ImportRowResult | null;
  /** Present only for a resolvable conflict (today: company code mismatch) so the UI can offer keep-vs-use-imported. Null once resolved or for other conflict kinds. */
  conflict: RowConflictDetails | null;
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
  /** Documents already resolved (found or confirmed absent) by preloadExistingCompanies -- skip the per-row fallback query for these even on a miss. */
  preloadedDocuments: Set<string>;
  /** companyId -> valid_to values already resolved (created or flagged duplicate) earlier in this same run, to catch in-batch duplicate rows without a DB round trip. */
  certificatesSeenInBatch: Map<string, Set<string>>;
  /** rowNumber -> user's choice for that row's code conflict, from the previous preview step. */
  resolutions: Record<string, RowResolution>;
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

const COMPANY_LOOKUP_COLUMNS =
  "id, code, document, document_type, corporate_name, trade_name, short_name, municipality, uf, responsible, phone, email, situation, notes";

async function loadExistingCompany(ctx: ProcessContext, normalizedDocument: string) {
  const { data } = await ctx.supabase
    .from("companies")
    .select(COMPANY_LOOKUP_COLUMNS)
    .eq("document", normalizedDocument)
    .maybeSingle();
  return data;
}

function cacheCompany(ctx: ProcessContext, normalizedDocument: string, existing: NonNullable<Awaited<ReturnType<typeof loadExistingCompany>>>) {
  const entry: CompanyCacheEntry = {
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

/**
 * A row-by-row import used to check "does this company already exist?" with
 * one sequential network round trip per row -- for a few hundred rows that's
 * well over a minute against a remote Postgres. Instead, resolve every
 * document in the file that COULD already exist up front, in a handful of
 * bulk `in()` queries, and prime the per-row caches before the main loop.
 */
async function preloadExistingCompanies(
  ctx: ProcessContext,
  rawRows: Record<string, string>[],
  mapping: Record<string, string>
): Promise<void> {
  const normalizedDocuments = new Set<string>();
  for (const raw of rawRows) {
    const mapped = mapRow(raw, mapping);
    if (!mapped.document) continue;
    const validation = validateDocument(mapped.document);
    if (validation.valid && validation.normalized) normalizedDocuments.add(validation.normalized);
  }
  if (normalizedDocuments.size === 0) return;

  const documents = [...normalizedDocuments];
  const chunkSize = 200;
  for (let i = 0; i < documents.length; i += chunkSize) {
    const chunk = documents.slice(i, i + chunkSize);
    const { data } = await ctx.supabase.from("companies").select(COMPANY_LOOKUP_COLUMNS).in("document", chunk);
    for (const existing of data ?? []) {
      cacheCompany(ctx, existing.document, existing);
    }
  }
  for (const doc of documents) ctx.preloadedDocuments.add(doc);
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
  const outcome = (
    result: ImportRowResult,
    message: string | null,
    companyId: string | null = null,
    certificateId: string | null = null,
    conflict: RowConflictDetails | null = null,
    // Every early return happens during company resolution, before any
    // certificate is touched, so `result` itself is the company outcome
    // there; the merged return at the bottom overrides both explicitly.
    companyOutcome: ImportRowResult | null = result,
    certOutcome: ImportRowResult | null = null
  ): ImportRowOutcome => ({
    rowNumber,
    raw,
    result,
    message,
    companyId,
    certificateId,
    companyOutcome,
    certOutcome,
    conflict,
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
  let codeConflict: RowConflictDetails | null = null;

  if (!entry && !ctx.preloadedDocuments.has(normalizedDocument)) {
    // Only reached for a document preloadExistingCompanies didn't already
    // resolve (e.g. it failed to normalize during that pre-pass). For every
    // document covered by the preload, a cache miss here means "confirmed
    // absent" -- no need to repeat the query.
    const existing = await loadExistingCompany(ctx, normalizedDocument);
    if (existing) {
      cacheCompany(ctx, normalizedDocument, existing);
      entry = ctx.companyByDocument.get(normalizedDocument);
    }
    ctx.preloadedDocuments.add(normalizedDocument);
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
      const resolution = ctx.resolutions[String(rowNumber)];
      if (resolution === "use_imported") {
        const previousCode = entry.code;
        if (!ctx.dryRun) {
          await ctx.supabase.from("companies").update({ code: mapped.code, updated_by: ctx.userId }).eq("id", entry.id);
        }
        ctx.companyByCode.delete(previousCode);
        ctx.companyByCode.set(mapped.code, normalizedDocument);
        entry.code = mapped.code;
        companyResult = "company_updated";
        companyMessage = `Código atualizado de ${previousCode} para ${mapped.code} (conforme escolha na prévia).`;
      } else {
        companyResult = "conflict";
        companyMessage = `Código informado (${mapped.code}) difere do código já cadastrado (${entry.code}). Mantido o código existente.`;
        codeConflict = { field: "code", existingValue: entry.code, importedValue: mapped.code };
      }
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

      // A company created earlier in THIS run can't already have a certificate
      // in the DB for any date -- so only a company that existed before this
      // import (or an exact repeat of a date already seen in this batch) needs
      // the real existence check. Avoids a DB round trip per row for the
      // common case (first-time bulk import into an otherwise-empty table).
      const seenInBatch = ctx.certificatesSeenInBatch.get(entry.id)?.has(validTo) ?? false;
      const alreadyExists = ctx.dryRun
        ? false
        : seenInBatch
          ? true
          : entry.isNewInBatch
            ? false
            : await certificateExists(ctx, entry.id, validTo);

      if (!ctx.dryRun) {
        if (!ctx.certificatesSeenInBatch.has(entry.id)) ctx.certificatesSeenInBatch.set(entry.id, new Set());
        ctx.certificatesSeenInBatch.get(entry.id)!.add(validTo);
      }

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

  return outcome(
    finalResult,
    finalMessage,
    entry.id.startsWith("pending:") ? null : entry.id,
    certificateId,
    finalResult === "conflict" ? codeConflict : null,
    companyResult,
    certResult
  );
}

export async function processImportRows(
  supabase: SupabaseClient,
  rawRows: Record<string, string>[],
  mapping: Record<string, string>,
  userId: string,
  dryRun: boolean,
  resolutions: Record<string, RowResolution> = {}
): Promise<ImportSummary> {
  const ctx: ProcessContext = {
    supabase,
    dryRun,
    userId,
    companyByDocument: new Map(),
    companyByCode: new Map(),
    maxValidToByCompany: new Map(),
    preloadedDocuments: new Set(),
    certificatesSeenInBatch: new Map(),
    resolutions,
  };

  await preloadExistingCompanies(ctx, rawRows, mapping);

  const rows: ImportRowOutcome[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    rows.push(await processRow(ctx, i + 2, rawRows[i], mapping));
  }

  // A single row can create/update a company AND create a certificate at the
  // same time -- count each side from its own outcome, not from `result`
  // (which collapses both into one display value and would silently drop
  // whichever one lost the priority order).
  const summary: ImportSummary = {
    totalRows: rawRows.length,
    companiesCreated: rows.filter((r) => r.companyOutcome === "company_created").length,
    companiesUpdated: rows.filter((r) => r.companyOutcome === "company_updated").length,
    certificatesCreated: rows.filter((r) => r.certOutcome === "certificate_created").length,
    duplicates: rows.filter((r) => r.certOutcome === "duplicate").length,
    conflicts: rows.filter((r) => r.result === "conflict").length,
    errors: rows.filter((r) => r.result === "error").length,
    rows,
  };

  return summary;
}

export { normalizeDocument, detectDocumentType };
