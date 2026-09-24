export interface AlvaraImportTargetField {
  key: string;
  label: string;
  required?: boolean;
}

/** Every column the Alvará import mapping step can point a spreadsheet header at. */
export const ALVARA_IMPORT_TARGET_FIELDS: AlvaraImportTargetField[] = [
  { key: "document", label: "CNPJ/CPF do cliente", required: true },
  { key: "tipo", label: "Tipo de alvará" },
  { key: "status", label: "Status" },
  { key: "vencimento", label: "Vencimento" },
  { key: "prioritario", label: "Prioritário" },
  { key: "arquivado", label: "Arquivado" },
  { key: "condicionantes_total", label: "Condicionantes -- Total" },
  { key: "condicionantes_atendidas", label: "Condicionantes -- Atendidas" },
  { key: "municipio", label: "Município" },
  { key: "uf", label: "UF" },
  { key: "lembretes", label: "Lembretes" },
  { key: "criado_em", label: "Criado em" },
];

const AUTO_MAP_HINTS: Record<string, string[]> = {
  document: ["cnpj/cpf", "cnpj", "cpf", "documento"],
  tipo: ["tipo"],
  status: ["status", "situacao"],
  vencimento: ["vencimento", "validade"],
  prioritario: ["prioritario"],
  arquivado: ["arquivado"],
  condicionantes_total: ["condicionantes total"],
  condicionantes_atendidas: ["condicionantes atendidas"],
  municipio: ["municipio", "cidade"],
  uf: ["uf", "estado"],
  lembretes: ["lembretes", "observacoes"],
  criado_em: ["criado em"],
};

function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

/** Suggests a target field for a raw spreadsheet header, for the mapping UI's defaults. */
export function suggestAlvaraFieldForHeader(header: string): string | null {
  const normalized = normalizeHeader(header);
  for (const [field, hints] of Object.entries(AUTO_MAP_HINTS)) {
    if (hints.some((hint) => normalized === hint || normalized.includes(hint))) {
      return field;
    }
  }
  return null;
}
