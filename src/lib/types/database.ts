/**
 * Hand-written row types mirroring supabase/migrations/*.sql.
 *
 * If you have the Supabase CLI linked to a live project, prefer regenerating
 * these with `supabase gen types typescript` and reconciling by hand -- but
 * keep the shapes below in sync either way, since a lot of the app is typed
 * against them.
 */

export type UserRole = "admin" | "user";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type DocumentType = "cnpj" | "cpf";
export type CompanyOrigin = "manual" | "import";

export interface Company {
  id: string;
  code: string;
  document: string;
  document_type: DocumentType;
  corporate_name: string;
  trade_name: string | null;
  short_name: string | null;
  municipality: string | null;
  uf: string | null;
  situation: string | null;
  responsible: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  origin: CompanyOrigin;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export type CertificateType = "e-cnpj" | "e-cpf";
export type CertificateModel = "A1" | "A3";
export type CertificateOrigin = "manual" | "import" | "pfx";
export type CertificateStatus =
  | "EM_DIA"
  | "VENCENDO"
  | "VENCE_HOJE"
  | "VENCIDO"
  | "ARQUIVADO";

export interface Certificate {
  id: string;
  company_id: string;
  type: CertificateType;
  model: CertificateModel;
  serial_number: string | null;
  subject: string | null;
  issuer: string | null;
  certificate_authority: string | null;
  valid_from: string | null;
  valid_to: string;
  fingerprint: string | null;
  algorithm: string | null;
  archived: boolean;
  is_current: boolean;
  origin: CertificateOrigin;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  created_by: string | null;
}

/** Row shape of the `certificates_view` (certificate + denormalized company fields + computed status). */
export interface CertificateWithCompany extends Certificate {
  status: CertificateStatus;
  status_priority: number;
  days_remaining: number;
  company_code: string;
  company_document: string;
  company_document_type: DocumentType;
  company_corporate_name: string;
  company_trade_name: string | null;
  company_short_name: string | null;
  company_municipality: string | null;
  company_uf: string | null;
  company_responsible: string | null;
  company_active: boolean;
}

export type CertificateHistoryAction =
  | "created"
  | "renewed"
  | "updated"
  | "archived"
  | "restored"
  | "deleted";

export interface CertificateHistoryEntry {
  id: string;
  certificate_id: string | null;
  company_id: string;
  action: CertificateHistoryAction;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
}

export type ImportType = "companies" | "certificates" | "combined";
export type ImportStatus = "pending" | "processing" | "completed" | "failed";

export interface ImportRun {
  id: string;
  file_name: string;
  import_type: ImportType;
  mapping: Record<string, string>;
  total_rows: number;
  companies_created: number;
  companies_updated: number;
  certificates_created: number;
  duplicates: number;
  conflicts: number;
  errors: number;
  status: ImportStatus;
  imported_by: string | null;
  created_at: string;
  completed_at: string | null;
}

export type ImportRowResult =
  | "company_created"
  | "company_updated"
  | "certificate_created"
  | "duplicate"
  | "conflict"
  | "error"
  | "skipped";

export interface ImportRow {
  id: string;
  import_id: string;
  row_number: number;
  raw_data: Record<string, unknown>;
  result: ImportRowResult;
  message: string | null;
  company_id: string | null;
  certificate_id: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type ReportBase = "companies" | "certificates" | "combined";

export interface ReportPreset {
  id: string;
  name: string;
  base: ReportBase;
  filters: Record<string, unknown>;
  columns: string[];
  order_by: { field: string; direction: "asc" | "desc" } | Record<string, never>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CertificateThresholdSettings {
  warning_days: number;
  alert_days: number[];
}

export interface UserTablePreference {
  user_id: string;
  table_key: string;
  columns: string[];
  updated_at: string;
}
