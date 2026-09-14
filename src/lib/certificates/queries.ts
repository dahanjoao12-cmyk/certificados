import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeDocument } from "@/lib/documents/document";
import type { CertificateStatus, CertificateWithCompany } from "@/lib/types/database";
import type { CertificateFilters } from "./filters";

function applyFilters(query: any, filters: CertificateFilters) {
  if (filters.q) {
    const escaped = filters.q.trim().replace(/[%_]/g, (m) => `\\${m}`);
    const normalizedDoc = normalizeDocument(filters.q);
    const orConditions = [
      `company_code.ilike.%${escaped}%`,
      `company_corporate_name.ilike.%${escaped}%`,
      `company_trade_name.ilike.%${escaped}%`,
      `company_short_name.ilike.%${escaped}%`,
    ];
    if (normalizedDoc.length > 0) {
      orConditions.push(`company_document.ilike.%${normalizedDoc}%`);
    }
    query = query.or(orConditions.join(","));
  }

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.model) query = query.eq("model", filters.model);
  if (filters.municipality) query = query.ilike("company_municipality", `%${filters.municipality}%`);
  if (filters.uf) query = query.eq("company_uf", filters.uf.toUpperCase());
  if (filters.responsible) query = query.ilike("company_responsible", `%${filters.responsible}%`);
  if (filters.active !== undefined) query = query.eq("company_active", filters.active);
  if (filters.archived !== undefined) query = query.eq("archived", filters.archived);
  if (filters.dueFrom) query = query.gte("valid_to", filters.dueFrom);
  if (filters.dueTo) query = query.lte("valid_to", filters.dueTo);

  return query;
}

export interface CertificateListResult {
  rows: CertificateWithCompany[];
  total: number;
}

/** Lists certificates (joined with company data) applying dashboard filters + pagination. */
export async function listCertificates(
  supabase: SupabaseClient,
  filters: CertificateFilters
): Promise<CertificateListResult> {
  let query = supabase.from("certificates_view").select("*", { count: "exact" });
  query = applyFilters(query, filters);

  const primarySort = filters.sort === "status_priority" ? "status_priority" : filters.sort;
  query = query.order(primarySort, { ascending: filters.dir === "asc" });
  if (primarySort !== "valid_to") {
    query = query.order("valid_to", { ascending: true });
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return { rows: (data ?? []) as CertificateWithCompany[], total: count ?? 0 };
}

/** Fetches ALL rows matching the filters, ignoring pagination -- used by export. */
export async function listAllCertificates(
  supabase: SupabaseClient,
  filters: CertificateFilters,
  hardCap = 20_000
): Promise<CertificateWithCompany[]> {
  let query = supabase.from("certificates_view").select("*");
  query = applyFilters(query, filters);
  query = query.order("status_priority", { ascending: true }).order("valid_to", { ascending: true });
  query = query.limit(hardCap);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CertificateWithCompany[];
}

export interface StatusCounts {
  total: number;
  active: number;
  em_dia: number;
  vencendo: number;
  vencido: number;
  arquivado: number;
}

/** Counts for the dashboard cards (section 8). "Ativos" = not archived. */
export async function getCertificateStatusCounts(
  supabase: SupabaseClient
): Promise<StatusCounts> {
  const countByStatus = async (status: CertificateStatus | null) => {
    let query = supabase
      .from("certificates_view")
      .select("id", { count: "exact", head: true });
    if (status) query = query.eq("status", status);
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  };

  const [total, emDia, vencendo, venceHoje, vencido, arquivado] = await Promise.all([
    countByStatus(null),
    countByStatus("EM_DIA"),
    countByStatus("VENCENDO"),
    countByStatus("VENCE_HOJE"),
    countByStatus("VENCIDO"),
    countByStatus("ARQUIVADO"),
  ]);

  return {
    total,
    active: total - arquivado,
    em_dia: emDia,
    vencendo: vencendo + venceHoje,
    vencido,
    arquivado,
  };
}
