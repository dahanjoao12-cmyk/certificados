import type { SupabaseClient } from "@supabase/supabase-js";
import { validateDocument } from "@/lib/documents/document";
import { parseFlexibleDate } from "@/lib/import/date";

export type AlvaraImportRowResult = "alvara_created" | "alvara_updated" | "type_created" | "error" | "skipped";

export interface AlvaraImportRowOutcome {
  rowNumber: number;
  result: AlvaraImportRowResult;
  message: string | null;
  companyId?: string | null;
  alvaraId?: string | null;
  rawData: Record<string, string>;
}

export interface AlvaraImportSummary {
  totalRows: number;
  alvarasCreated: number;
  alvarasUpdated: number;
  typesCreated: number;
  errors: number;
  rows: AlvaraImportRowOutcome[];
}

const MANUAL_STATUSES = new Set(["AGUARDANDO", "CGSIM", "TERCEIROS"]);
const TYPE_COLOR_PALETTE = ["#2563eb", "#d97706", "#059669", "#7c3aed", "#db2777", "#0891b2"];

function normalizeLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toUpperCase();
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = normalizeLabel(value);
  return normalized === "SIM" || normalized === "S" || normalized === "TRUE" || normalized === "1";
}

function parseMetragem(value: string | undefined): number | null {
  const trimmed = (value ?? "").trim().replace(",", ".");
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** "18/06/2026 14:31" -> "18/06/2026" -- Criado Em/Vencimento carregam hora, mas parseFlexibleDate só entende data. */
function dateOnly(value: string | undefined): string {
  return (value ?? "").trim().split(" ")[0] ?? "";
}

function mapRow(raw: Record<string, string>, mapping: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [header, target] of Object.entries(mapping)) {
    if (!target) continue;
    const value = raw[header];
    if (value !== undefined && value.trim() !== "") mapped[target] = value.trim();
  }
  return mapped;
}

/**
 * Processa linhas de alvará (dry-run ou commit). Diferente do importador de
 * empresas/certificados (src/lib/import/process.ts): nunca cria uma empresa
 * -- documento que não bate é sempre erro -- e nunca abre tela de conflito,
 * já que o valor importado é sempre tratado como autoridade para um alvará
 * existente (mesma chave company_id+type_id).
 */
export async function processAlvaraImportRows(
  supabase: SupabaseClient,
  rawRows: Record<string, string>[],
  mapping: Record<string, string>,
  userId: string,
  dryRun: boolean
): Promise<AlvaraImportSummary> {
  const rows: AlvaraImportRowOutcome[] = [];
  let alvarasCreated = 0;
  let alvarasUpdated = 0;
  let typesCreated = 0;
  let errors = 0;

  // Pré-carrega empresas por documento normalizado, em lote (chunked in()).
  const documents = new Set<string>();
  for (const raw of rawRows) {
    const mapped = mapRow(raw, mapping);
    if (!mapped.document) continue;
    const validation = validateDocument(mapped.document);
    if (validation.valid) documents.add(validation.normalized);
  }
  const companyByDocument = new Map<string, string>();
  const docList = [...documents];
  for (let i = 0; i < docList.length; i += 200) {
    const chunk = docList.slice(i, i + 200);
    const { data } = await supabase.from("companies").select("id, document").in("document", chunk);
    for (const c of data ?? []) companyByDocument.set(c.document as string, c.id as string);
  }

  // Pré-carrega tipos existentes (nome normalizado -> id) e cor a partir daí.
  const { data: existingTypes } = await supabase.from("alvara_types").select("id, name");
  const typeIdByName = new Map<string, string>();
  for (const t of existingTypes ?? []) typeIdByName.set(normalizeLabel(t.name as string), t.id as string);
  let paletteIndex = (existingTypes ?? []).length;

  // Pré-carrega alvarás existentes por (company_id:type_id) -- decide criar vs. atualizar.
  const { data: existingAlvaras } = await supabase.from("alvaras").select("id, company_id, type_id");
  const alvaraIdByKey = new Map<string, string>();
  for (const a of existingAlvaras ?? []) {
    alvaraIdByKey.set(`${a.company_id}:${a.type_id}`, a.id as string);
  }

  for (let index = 0; index < rawRows.length; index++) {
    const rowNumber = index + 1;
    const rawData = rawRows[index];
    const mapped = mapRow(rawData, mapping);

    if (!mapped.document) {
      rows.push({ rowNumber, result: "error", message: "CNPJ/CPF não informado.", rawData });
      errors++;
      continue;
    }
    const validation = validateDocument(mapped.document);
    if (!validation.valid) {
      rows.push({ rowNumber, result: "error", message: `CNPJ/CPF inválido: ${mapped.document}`, rawData });
      errors++;
      continue;
    }
    const companyId = companyByDocument.get(validation.normalized);
    if (!companyId) {
      rows.push({
        rowNumber,
        result: "error",
        message: "CNPJ/CPF não encontrado em Clientes -- cadastre a empresa antes de importar os alvarás dela.",
        rawData,
      });
      errors++;
      continue;
    }

    if (!mapped.tipo) {
      rows.push({ rowNumber, result: "error", message: "Tipo de alvará não informado.", companyId, rawData });
      errors++;
      continue;
    }
    const typeKey = normalizeLabel(mapped.tipo);
    let typeId = typeIdByName.get(typeKey);
    let typeCreatedNote = "";
    if (!typeId) {
      if (dryRun) {
        typeId = `pending:${typeKey}`;
      } else {
        const color = TYPE_COLOR_PALETTE[paletteIndex % TYPE_COLOR_PALETTE.length];
        const { data: newType, error } = await supabase
          .from("alvara_types")
          .insert({ name: mapped.tipo, color })
          .select("id")
          .single();
        if (error || !newType) {
          rows.push({ rowNumber, result: "error", message: "Não foi possível criar o tipo de alvará.", companyId, rawData });
          errors++;
          continue;
        }
        typeId = newType.id as string;
      }
      paletteIndex++;
      typeIdByName.set(typeKey, typeId);
      typesCreated++;
      typeCreatedNote = ` (tipo "${mapped.tipo}" criado)`;
    }

    // Status -> tri-estado. Uma data preenchida sempre manda (recalculamos o
    // status ao vivo, nunca confiamos no rótulo já computado pela planilha).
    const statusText = mapped.status ? normalizeLabel(mapped.status) : "";
    const vencimento = mapped.vencimento ? parseFlexibleDate(dateOnly(mapped.vencimento)) : null;

    let issued = false;
    let isPermanent = false;
    let validTo: string | null = null;
    let manualStatus: "AGUARDANDO" | "CGSIM" | "TERCEIROS" = "AGUARDANDO";
    let statusWarning = "";

    if (vencimento) {
      issued = true;
      validTo = vencimento;
    } else if (statusText === "DEFINITIVO") {
      issued = true;
      isPermanent = true;
    } else if (MANUAL_STATUSES.has(statusText)) {
      manualStatus = statusText as "AGUARDANDO" | "CGSIM" | "TERCEIROS";
    } else if (statusText) {
      statusWarning = ` (status "${mapped.status}" não reconhecido, importado como Aguardando)`;
    }

    const payload: Record<string, unknown> = {
      company_id: companyId,
      type_id: typeId,
      manual_status: manualStatus,
      issued,
      is_permanent: isPermanent,
      valid_to: validTo,
      issued_at: issued && mapped.emitido_em ? parseFlexibleDate(dateOnly(mapped.emitido_em)) : null,
      prioritario: parseBoolean(mapped.prioritario),
      archived: parseBoolean(mapped.arquivado),
      metragem_m2: parseMetragem(mapped.metragem_m2),
      municipality: mapped.municipio || null,
      uf: mapped.uf ? mapped.uf.toUpperCase().slice(0, 2) : null,
      notes: mapped.lembretes || null,
      origin: "import",
      updated_by: userId,
    };

    const createdAt = mapped.criado_em ? parseFlexibleDate(dateOnly(mapped.criado_em)) : null;

    const key = `${companyId}:${typeId}`;
    const existingId = typeId.startsWith("pending:") ? undefined : alvaraIdByKey.get(key);

    if (existingId) {
      if (!dryRun) {
        const { error } = await supabase.from("alvaras").update(payload).eq("id", existingId);
        if (error) {
          rows.push({ rowNumber, result: "error", message: "Não foi possível atualizar o alvará.", companyId, rawData });
          errors++;
          continue;
        }
      }
      alvarasUpdated++;
      rows.push({
        rowNumber,
        result: "alvara_updated",
        message: `Alvará atualizado.${typeCreatedNote}${statusWarning}`,
        companyId,
        alvaraId: existingId,
        rawData,
      });
    } else {
      let newAlvaraId: string | null = null;
      if (!dryRun) {
        const insertPayload = { ...payload, created_by: userId, ...(createdAt ? { created_at: createdAt } : {}) };
        const { data: created, error } = await supabase.from("alvaras").insert(insertPayload).select("id").single();
        if (error || !created) {
          rows.push({ rowNumber, result: "error", message: "Não foi possível criar o alvará.", companyId, rawData });
          errors++;
          continue;
        }
        newAlvaraId = created.id as string;
        alvaraIdByKey.set(key, newAlvaraId);
      }
      alvarasCreated++;
      rows.push({
        rowNumber,
        result: "alvara_created",
        message: `Alvará criado.${typeCreatedNote}${statusWarning}`,
        companyId,
        alvaraId: newAlvaraId,
        rawData,
      });
    }
  }

  return { totalRows: rawRows.length, alvarasCreated, alvarasUpdated, typesCreated, errors, rows };
}
