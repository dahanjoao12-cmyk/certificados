export interface ColumnDef {
  key: string;
  label: string;
}

/** All columns the certificates table can show (section 11/12). Order here is the default order. */
export const CERTIFICATE_COLUMNS: ColumnDef[] = [
  { key: "company_code", label: "Código" },
  { key: "company_document", label: "CNPJ/CPF" },
  { key: "company_corporate_name", label: "Cliente" },
  { key: "company_municipality", label: "Município" },
  { key: "company_uf", label: "UF" },
  { key: "type", label: "Certificado" },
  { key: "model", label: "Modelo" },
  { key: "valid_to", label: "Vencimento" },
  { key: "days_remaining", label: "Dias restantes" },
  { key: "status", label: "Status" },
  { key: "serial_number", label: "Número de série" },
  { key: "certificate_authority", label: "Autoridade certificadora" },
  { key: "company_responsible", label: "Responsável" },
  { key: "created_at", label: "Criado em" },
  { key: "updated_at", label: "Atualizado em" },
];

export const DEFAULT_VISIBLE_CERTIFICATE_COLUMNS = [
  "company_code",
  "company_document",
  "company_corporate_name",
  "company_municipality",
  "company_uf",
  "type",
  "model",
  "valid_to",
  "days_remaining",
  "status",
];

export const CERTIFICATE_TABLE_KEY = "certificates_dashboard";

export function resolveVisibleColumns(requested: string[] | undefined): ColumnDef[] {
  const validKeys = new Set(CERTIFICATE_COLUMNS.map((c) => c.key));
  const keys = (requested ?? DEFAULT_VISIBLE_CERTIFICATE_COLUMNS).filter((k) => validKeys.has(k));
  const finalKeys = keys.length > 0 ? keys : DEFAULT_VISIBLE_CERTIFICATE_COLUMNS;
  const byKey = new Map(CERTIFICATE_COLUMNS.map((c) => [c.key, c]));
  return finalKeys.map((k) => byKey.get(k)!).filter(Boolean);
}
