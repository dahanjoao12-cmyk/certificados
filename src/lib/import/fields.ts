export interface ImportTargetField {
  key: string;
  label: string;
  group: "empresa" | "certificado";
  required?: boolean;
}

/**
 * Every field a spreadsheet column can be mapped to. Deliberately a flat
 * catalog (not two separate "companies" / "certificates" import types):
 * the office's real spreadsheets mix company registry columns and
 * certificate due-date columns, so one mapping step has to cover both
 * (section 17: cruzamento das planilhas).
 */
export const IMPORT_TARGET_FIELDS: ImportTargetField[] = [
  { key: "document", label: "CNPJ/CPF", group: "empresa", required: true },
  { key: "code", label: "Código", group: "empresa" },
  { key: "corporate_name", label: "Razão social", group: "empresa" },
  { key: "trade_name", label: "Nome fantasia", group: "empresa" },
  { key: "short_name", label: "Nome abreviado", group: "empresa" },
  { key: "municipality", label: "Município", group: "empresa" },
  { key: "uf", label: "UF", group: "empresa" },
  { key: "responsible", label: "Responsável", group: "empresa" },
  { key: "phone", label: "Telefone", group: "empresa" },
  { key: "email", label: "E-mail", group: "empresa" },
  { key: "situation", label: "Situação", group: "empresa" },
  { key: "notes", label: "Observações (empresa)", group: "empresa" },
  { key: "valid_to", label: "Vencimento do certificado", group: "certificado" },
  { key: "valid_from", label: "Início da validade", group: "certificado" },
  { key: "cert_type", label: "Tipo (e-CNPJ/e-CPF)", group: "certificado" },
  { key: "cert_model", label: "Modelo (A1/A3)", group: "certificado" },
  { key: "certificate_authority", label: "Autoridade certificadora", group: "certificado" },
  { key: "serial_number", label: "Número de série", group: "certificado" },
];

const AUTO_MAP_HINTS: Record<string, string[]> = {
  document: ["cnpj/cpf", "cnpj", "cpf", "documento"],
  code: ["codigo", "código", "cod"],
  corporate_name: ["razao social", "razão social", "nome/razao social", "nome / razão social"],
  trade_name: ["nome fantasia", "fantasia"],
  short_name: ["nome abreviado", "nome", "cliente", "abreviado"],
  municipality: ["municipio", "município", "cidade"],
  uf: ["uf", "estado"],
  valid_to: ["vencimento", "validade", "data de vencimento"],
};

function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

/** Suggests a target field for a raw spreadsheet header, for the mapping UI's defaults. */
export function suggestFieldForHeader(header: string): string | null {
  const normalized = normalizeHeader(header);
  for (const [field, hints] of Object.entries(AUTO_MAP_HINTS)) {
    if (hints.some((hint) => normalized === hint || normalized.includes(hint))) {
      return field;
    }
  }
  return null;
}
