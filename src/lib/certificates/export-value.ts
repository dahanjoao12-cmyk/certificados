import { formatDocument } from "@/lib/documents/document";
import type { CertificateWithCompany } from "@/lib/types/database";

export interface ExportCell {
  value: string | number | Date | null;
  /** Forces the spreadsheet cell to be stored/formatted as text (e.g. codes, documents: never let Excel turn them into numbers/scientific notation). */
  isText?: boolean;
  /** Marks the value as a real Date, so the xlsx writer emits a native Excel date cell (dd/mm/yyyy) and the CSV writer formats it the same way. */
  isDate?: boolean;
}

/**
 * Single source of truth for turning a certificate row into an exportable
 * value, shared by the XLSX and CSV writers so both stay consistent
 * (section 46/47: no scientific notation, dates recognizable, codes/CNPJ
 * preserved exactly as text).
 */
export function getCertificateExportValue(
  row: CertificateWithCompany,
  key: string
): ExportCell {
  switch (key) {
    case "company_code":
      return { value: row.company_code, isText: true };
    case "company_document":
      return { value: formatDocument(row.company_document), isText: true };
    case "company_corporate_name":
      return { value: row.company_corporate_name };
    case "company_trade_name":
      return { value: row.company_trade_name };
    case "company_short_name":
      return { value: row.company_short_name };
    case "company_municipality":
      return { value: row.company_municipality };
    case "company_uf":
      return { value: row.company_uf, isText: true };
    case "company_responsible":
      return { value: row.company_responsible };
    case "type":
      return { value: row.type === "e-cnpj" ? "e-CNPJ" : "e-CPF" };
    case "model":
      return { value: row.model, isText: true };
    case "valid_from":
      return { value: toDate(row.valid_from), isDate: true };
    case "valid_to":
      return { value: toDate(row.valid_to), isDate: true };
    case "days_remaining":
      return { value: row.archived ? null : row.days_remaining };
    case "status":
      return { value: statusLabel(row.status) };
    case "warning_days":
      return { value: row.warning_days };
    case "archived":
      return { value: row.archived ? "Sim" : "Não" };
    case "notes":
      return { value: row.notes };
    case "created_at":
      return { value: toDate(row.created_at.slice(0, 10)), isDate: true };
    case "updated_at":
      return { value: toDate(row.updated_at.slice(0, 10)), isDate: true };
    default:
      return { value: null };
  }
}

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function statusLabel(status: CertificateWithCompany["status"]): string {
  const labels: Record<string, string> = {
    EM_DIA: "Em dia",
    VENCENDO: "Vencendo",
    VENCE_HOJE: "Vence hoje",
    VENCIDO: "Vencido",
    ARQUIVADO: "Arquivado",
  };
  return labels[status] ?? status;
}

export const EXPORTABLE_CERTIFICATE_COLUMNS: { key: string; label: string }[] = [
  { key: "company_code", label: "Código" },
  { key: "company_document", label: "CNPJ/CPF" },
  { key: "company_corporate_name", label: "Cliente" },
  { key: "company_trade_name", label: "Nome fantasia" },
  { key: "company_short_name", label: "Nome abreviado" },
  { key: "company_municipality", label: "Município" },
  { key: "company_uf", label: "UF" },
  { key: "company_responsible", label: "Responsável" },
  { key: "type", label: "Tipo" },
  { key: "model", label: "Modelo" },
  { key: "valid_from", label: "Início da validade" },
  { key: "valid_to", label: "Vencimento" },
  { key: "days_remaining", label: "Dias restantes" },
  { key: "status", label: "Status" },
  { key: "warning_days", label: "Prazo de aviso (dias)" },
  { key: "archived", label: "Arquivado" },
  { key: "notes", label: "Observações" },
  { key: "created_at", label: "Criado em" },
  { key: "updated_at", label: "Atualizado em" },
];
