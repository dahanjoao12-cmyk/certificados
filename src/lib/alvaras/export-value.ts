import { formatDocument } from "@/lib/documents/document";
import { ALVARA_STATUS_LABELS } from "./status";
import type { AlvaraWithCompany } from "@/lib/types/database";

export interface ExportCell {
  value: string | number | Date | null;
  isText?: boolean;
  isDate?: boolean;
}

/** Single source of truth for turning an alvará row into an exportable value -- mirrors certificates/export-value.ts. */
export function getAlvaraExportValue(row: AlvaraWithCompany, key: string): ExportCell {
  switch (key) {
    case "company_code":
      return { value: row.company_code, isText: true };
    case "company_document":
      return { value: formatDocument(row.company_document), isText: true };
    case "company_corporate_name":
      return { value: row.company_corporate_name };
    case "type_name":
      return { value: row.type_name };
    case "status":
      return { value: ALVARA_STATUS_LABELS[row.status] ?? row.status };
    case "valid_to":
      return { value: toDate(row.valid_to), isDate: true };
    case "days_remaining":
      return { value: row.archived || row.days_remaining === null ? null : row.days_remaining };
    case "prioritario":
      return { value: row.prioritario ? "Sim" : "Não" };
    case "metragem_m2":
      return { value: row.metragem_m2 };
    case "municipality":
      return { value: row.municipality };
    case "uf":
      return { value: row.uf, isText: true };
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

export const EXPORTABLE_ALVARA_COLUMNS: { key: string; label: string }[] = [
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
