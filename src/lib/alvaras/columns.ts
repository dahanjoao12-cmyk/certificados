export interface ColumnDef {
  key: string;
  label: string;
}

export const ALVARA_COLUMNS: ColumnDef[] = [
  { key: "company_code", label: "Código" },
  { key: "company_document", label: "CNPJ/CPF" },
  { key: "company_corporate_name", label: "Cliente" },
  { key: "type_name", label: "Tipo" },
  { key: "status", label: "Status" },
  { key: "valid_to", label: "Vencimento" },
  { key: "days_remaining", label: "Dias restantes" },
  { key: "prioritario", label: "Prioritário" },
  { key: "metragem_m2", label: "Metragem (m²)" },
  { key: "municipality", label: "Município" },
  { key: "uf", label: "UF" },
  { key: "notes", label: "Lembretes" },
  { key: "created_at", label: "Criado em" },
  { key: "updated_at", label: "Atualizado em" },
];

export const DEFAULT_VISIBLE_ALVARA_COLUMNS = [
  "company_code",
  "company_corporate_name",
  "type_name",
  "status",
  "valid_to",
  "days_remaining",
  "prioritario",
];

export const ALVARA_TABLE_KEY = "alvaras_dashboard";

export function resolveVisibleColumns(requested: string[] | undefined): ColumnDef[] {
  const validKeys = new Set(ALVARA_COLUMNS.map((c) => c.key));
  const keys = (requested ?? DEFAULT_VISIBLE_ALVARA_COLUMNS).filter((k) => validKeys.has(k));
  const finalKeys = keys.length > 0 ? keys : DEFAULT_VISIBLE_ALVARA_COLUMNS;
  const byKey = new Map(ALVARA_COLUMNS.map((c) => [c.key, c]));
  return finalKeys.map((k) => byKey.get(k)!).filter(Boolean);
}
