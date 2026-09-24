import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeDocument } from "@/lib/documents/document";
import type { AlvaraWithCompany, AlvaraType } from "@/lib/types/database";
import type { AlvaraFilters } from "./filters";

/** Cadastro de tipos de alvará (nome + cor) -- lido pelo formulário, pela tabela e pelo import. */
export async function listAlvaraTypes(supabase: SupabaseClient): Promise<AlvaraType[]> {
  const { data, error } = await supabase.from("alvara_types").select("*").order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AlvaraType[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, filters: AlvaraFilters) {
  if (filters.q) {
    const escaped = filters.q.trim().replace(/[%_]/g, (m) => `\\${m}`);
    const normalizedDoc = normalizeDocument(filters.q);
    const orConditions = [
      `company_code.ilike.%${escaped}%`,
      `company_corporate_name.ilike.%${escaped}%`,
      `company_trade_name.ilike.%${escaped}%`,
      `company_short_name.ilike.%${escaped}%`,
      `type_name.ilike.%${escaped}%`,
    ];
    if (normalizedDoc.length > 0) {
      orConditions.push(`company_document.ilike.%${normalizedDoc}%`);
    }
    query = query.or(orConditions.join(","));
  }

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.typeId) query = query.eq("type_id", filters.typeId);
  if (filters.prioritario !== undefined) query = query.eq("prioritario", filters.prioritario);
  if (filters.archived !== undefined) query = query.eq("archived", filters.archived);
  if (filters.uf) query = query.eq("uf", filters.uf.toUpperCase());
  if (filters.municipality) query = query.ilike("municipality", `%${filters.municipality}%`);
  if (filters.dueFrom) query = query.gte("valid_to", filters.dueFrom);
  if (filters.dueTo) query = query.lte("valid_to", filters.dueTo);

  return query;
}

export interface AlvaraListResult {
  rows: AlvaraWithCompany[];
  total: number;
}

export async function listAlvaras(supabase: SupabaseClient, filters: AlvaraFilters): Promise<AlvaraListResult> {
  let query = supabase.from("alvaras_view").select("*", { count: "exact" });
  query = applyFilters(query, filters);

  const primarySort = filters.sort === "status_priority" ? "status_priority" : filters.sort;
  query = query.order(primarySort, { ascending: filters.dir === "asc" });
  if (primarySort !== "valid_to") {
    query = query.order("valid_to", { ascending: true, nullsFirst: false });
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return { rows: (data ?? []) as AlvaraWithCompany[], total: count ?? 0 };
}

/** Fetches ALL rows matching the filters, ignoring pagination -- used by export/calendar. */
export async function listAllAlvaras(
  supabase: SupabaseClient,
  filters: AlvaraFilters,
  hardCap = 20_000
): Promise<AlvaraWithCompany[]> {
  let query = supabase.from("alvaras_view").select("*");
  query = applyFilters(query, filters);
  query = query.order("status_priority", { ascending: true }).order("valid_to", { ascending: true, nullsFirst: false });
  query = query.limit(hardCap);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AlvaraWithCompany[];
}

export interface AlvaraStatusCounts {
  total: number;
  active: number;
  pendentes: number;
  vencendo: number;
  vencido: number;
  arquivado: number;
}

/** Counts for the dashboard/table cards. "Ativos" = not archived. */
export async function getAlvaraStatusCounts(supabase: SupabaseClient): Promise<AlvaraStatusCounts> {
  const countByStatuses = async (statuses: string[] | null) => {
    let query = supabase.from("alvaras_view").select("id", { count: "exact", head: true });
    if (statuses) query = query.in("status", statuses);
    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  };

  const [total, pendentes, vencendo, vencido, arquivado] = await Promise.all([
    countByStatuses(null),
    countByStatuses(["AGUARDANDO", "CGSIM"]),
    countByStatuses(["VENCENDO", "VENCE_HOJE"]),
    countByStatuses(["VENCIDO"]),
    countByStatuses(["ARQUIVADO"]),
  ]);

  return {
    total,
    active: total - arquivado,
    pendentes,
    vencendo,
    vencido,
    arquivado,
  };
}
