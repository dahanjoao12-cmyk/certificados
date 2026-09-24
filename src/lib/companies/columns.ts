import { formatDocument } from "@/lib/documents/document";
import type { Company } from "@/lib/types/database";
import type { ExportCell } from "@/lib/certificates/export-value";

export interface ColumnDef {
  key: string;
  label: string;
}

export const COMPANY_COLUMNS: ColumnDef[] = [
  { key: "code", label: "Código" },
  { key: "document", label: "CNPJ/CPF" },
  { key: "corporate_name", label: "Razão social" },
  { key: "trade_name", label: "Nome fantasia" },
  { key: "short_name", label: "Nome abreviado" },
  { key: "municipality", label: "Município" },
  { key: "uf", label: "UF" },
  { key: "situation", label: "Situação" },
  { key: "responsible", label: "Responsável" },
  { key: "phone", label: "Telefone" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "E-mail" },
  { key: "state_registration", label: "Inscrição Estadual" },
  { key: "municipal_tax_registration", label: "Inscrição Fiscal Municipal" },
  { key: "zip_code", label: "CEP" },
  { key: "address_street", label: "Logradouro" },
  { key: "address_number", label: "Número" },
  { key: "address_complement", label: "Complemento" },
  { key: "neighborhood", label: "Bairro" },
  { key: "active", label: "Ativa" },
  { key: "origin", label: "Origem do cadastro" },
  { key: "notes", label: "Observações" },
  { key: "created_at", label: "Criado em" },
  { key: "updated_at", label: "Atualizado em" },
];

export const DEFAULT_VISIBLE_COMPANY_COLUMNS = [
  "code",
  "document",
  "corporate_name",
  "municipality",
  "uf",
  "situation",
];

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function getCompanyExportValue(row: Company, key: string): ExportCell {
  switch (key) {
    case "code":
      return { value: row.code, isText: true };
    case "document":
      return { value: formatDocument(row.document), isText: true };
    case "corporate_name":
      return { value: row.corporate_name };
    case "trade_name":
      return { value: row.trade_name };
    case "short_name":
      return { value: row.short_name };
    case "municipality":
      return { value: row.municipality };
    case "uf":
      return { value: row.uf, isText: true };
    case "situation":
      return { value: row.situation };
    case "responsible":
      return { value: row.responsible };
    case "phone":
      return { value: row.phone };
    case "whatsapp":
      return { value: row.whatsapp };
    case "email":
      return { value: row.email };
    case "state_registration":
      return { value: row.state_registration };
    case "municipal_tax_registration":
      return { value: row.municipal_tax_registration };
    case "zip_code":
      return { value: row.zip_code, isText: true };
    case "address_street":
      return { value: row.address_street };
    case "address_number":
      return { value: row.address_number, isText: true };
    case "address_complement":
      return { value: row.address_complement };
    case "neighborhood":
      return { value: row.neighborhood };
    case "active":
      return { value: row.active ? "Sim" : "Não" };
    case "origin":
      return { value: row.origin === "import" ? "Importado" : "Manual" };
    case "notes":
      return { value: row.notes };
    case "created_at":
      return { value: toDate(row.created_at), isDate: true };
    case "updated_at":
      return { value: toDate(row.updated_at), isDate: true };
    default:
      return { value: null };
  }
}
