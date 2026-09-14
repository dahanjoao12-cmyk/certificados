import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeDocument } from "@/lib/documents/document";
import type { Company } from "@/lib/types/database";

export interface CompanyFilters {
  q?: string;
  municipality?: string;
  uf?: string;
  active?: boolean;
  origin?: "manual" | "import";
  hasCertificate?: boolean;
  sort: "code" | "corporate_name" | "municipality" | "uf" | "created_at";
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
}

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const SORTABLE = ["code", "corporate_name", "municipality", "uf", "created_at"] as const;

export function parseCompanyFilters(searchParams: SearchParams): CompanyFilters {
  const page = Math.max(1, Number(firstValue(searchParams.page)) || 1);
  const pageSize = [25, 50, 100, 200].includes(Number(firstValue(searchParams.pageSize)))
    ? Number(firstValue(searchParams.pageSize))
    : 50;
  const sortParam = firstValue(searchParams.sort);
  const sort = ((SORTABLE as readonly string[]).includes(sortParam ?? "")
    ? sortParam
    : "corporate_name") as CompanyFilters["sort"];
  const dir = firstValue(searchParams.dir) === "desc" ? "desc" : "asc";

  return {
    q: firstValue(searchParams.q) || undefined,
    municipality: firstValue(searchParams.municipality) || undefined,
    uf: firstValue(searchParams.uf) || undefined,
    active: firstValue(searchParams.active) ? firstValue(searchParams.active) === "true" : undefined,
    origin: (firstValue(searchParams.origin) as "manual" | "import") || undefined,
    sort,
    dir,
    page,
    pageSize,
  };
}

export async function listCompanies(
  supabase: SupabaseClient,
  filters: CompanyFilters
): Promise<{ rows: Company[]; total: number }> {
  let query = supabase.from("companies").select("*", { count: "exact" });

  if (filters.q) {
    const escaped = filters.q.trim().replace(/[%_]/g, (m) => `\\${m}`);
    const normalizedDoc = normalizeDocument(filters.q);
    const orConditions = [
      `code.ilike.%${escaped}%`,
      `corporate_name.ilike.%${escaped}%`,
      `trade_name.ilike.%${escaped}%`,
      `short_name.ilike.%${escaped}%`,
    ];
    if (normalizedDoc.length > 0) orConditions.push(`document.ilike.%${normalizedDoc}%`);
    query = query.or(orConditions.join(","));
  }
  if (filters.municipality) query = query.ilike("municipality", `%${filters.municipality}%`);
  if (filters.uf) query = query.eq("uf", filters.uf.toUpperCase());
  if (filters.active !== undefined) query = query.eq("active", filters.active);
  if (filters.origin) query = query.eq("origin", filters.origin);

  query = query.order(filters.sort, { ascending: filters.dir === "asc" });

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as Company[], total: count ?? 0 };
}
