import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDocument } from "@/lib/documents/document";
import type { ExportColumn } from "@/lib/export/xlsx";
import type { ExportCell } from "@/lib/certificates/export-value";

export type AuxiliaryReportKind =
  | "sem_certificado"
  | "multiplos_certificados"
  | "renovacoes"
  | "auditoria";

interface AuxiliaryReport {
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  toCells: (row: Record<string, unknown>) => ExportCell[];
}

function toDate(value: string | null): Date | null {
  if (!value) return null;
  return new Date(value);
}

export async function loadAuxiliaryReport(
  supabase: SupabaseClient,
  kind: AuxiliaryReportKind
): Promise<AuxiliaryReport> {
  if (kind === "sem_certificado") {
    const { data } = await supabase
      .from("companies_without_certificate")
      .select("*")
      .order("corporate_name");
    const columns: ExportColumn[] = [
      { key: "code", label: "Código" },
      { key: "document", label: "CNPJ/CPF" },
      { key: "corporate_name", label: "Cliente" },
      { key: "municipality", label: "Município" },
      { key: "uf", label: "UF" },
    ];
    return {
      columns,
      rows: data ?? [],
      toCells: (row) => [
        { value: row.code as string, isText: true },
        { value: formatDocument(row.document as string), isText: true },
        { value: row.corporate_name as string },
        { value: row.municipality as string | null },
        { value: row.uf as string | null, isText: true },
      ],
    };
  }

  if (kind === "multiplos_certificados") {
    const { data } = await supabase
      .from("companies_certificate_counts")
      .select("*")
      .order("certificate_count", { ascending: false });
    const columns: ExportColumn[] = [
      { key: "code", label: "Código" },
      { key: "document", label: "CNPJ/CPF" },
      { key: "corporate_name", label: "Cliente" },
      { key: "certificate_count", label: "Qtd. certificados" },
    ];
    return {
      columns,
      rows: data ?? [],
      toCells: (row) => [
        { value: row.code as string, isText: true },
        { value: formatDocument(row.document as string), isText: true },
        { value: row.corporate_name as string },
        { value: row.certificate_count as number },
      ],
    };
  }

  if (kind === "renovacoes") {
    const { data } = await supabase
      .from("certificate_history")
      .select("*, company:companies(code, corporate_name), changed_by_profile:profiles(full_name)")
      .eq("action", "renewed")
      .order("changed_at", { ascending: false })
      .limit(500);
    const columns: ExportColumn[] = [
      { key: "changed_at", label: "Data" },
      { key: "code", label: "Código" },
      { key: "corporate_name", label: "Cliente" },
      { key: "old_value", label: "Vencimento anterior" },
      { key: "new_value", label: "Novo vencimento" },
      { key: "changed_by", label: "Usuário" },
    ];
    const rows = (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      code: (r.company as { code?: string } | null)?.code ?? "",
      corporate_name: (r.company as { corporate_name?: string } | null)?.corporate_name ?? "",
      changed_by: (r.changed_by_profile as { full_name?: string } | null)?.full_name ?? "",
    }));
    return {
      columns,
      rows,
      toCells: (row) => [
        { value: toDate(row.changed_at as string), isDate: true },
        { value: row.code as string, isText: true },
        { value: row.corporate_name as string },
        { value: toDate(row.old_value as string | null), isDate: true },
        { value: toDate(row.new_value as string), isDate: true },
        { value: row.changed_by as string },
      ],
    };
  }

  // auditoria
  const { data } = await supabase
    .from("audit_logs")
    .select("*, user_profile:profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(500);
  const columns: ExportColumn[] = [
    { key: "created_at", label: "Data" },
    { key: "user_name", label: "Usuário" },
    { key: "action", label: "Ação" },
    { key: "entity_type", label: "Entidade" },
    { key: "description", label: "Descrição" },
  ];
  const rows = (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    user_name: (r.user_profile as { full_name?: string } | null)?.full_name ?? "Sistema",
  }));
  return {
    columns,
    rows,
    toCells: (row) => [
      { value: new Date(row.created_at as string), isDate: true },
      { value: row.user_name as string },
      { value: row.action as string },
      { value: row.entity_type as string },
      { value: row.description as string },
    ],
  };
}
