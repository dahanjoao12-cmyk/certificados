import type { CertificateStatus } from "@/lib/types/database";

export type DueQuickFilter =
  | "today"
  | "next_7"
  | "next_15"
  | "next_30"
  | "next_60"
  | "next_90"
  | "this_month"
  | "next_month"
  | "custom";

export const DUE_QUICK_FILTER_LABELS: Record<DueQuickFilter, string> = {
  today: "Vence hoje",
  next_7: "Próximos 7 dias",
  next_15: "Próximos 15 dias",
  next_30: "Próximos 30 dias",
  next_60: "Próximos 60 dias",
  next_90: "Próximos 90 dias",
  this_month: "Este mês",
  next_month: "Próximo mês",
  custom: "Período personalizado",
};

export const SORTABLE_FIELDS = [
  "company_code",
  "company_corporate_name",
  "company_municipality",
  "company_uf",
  "valid_to",
  "days_remaining",
  "status",
] as const;
export type SortableField = (typeof SORTABLE_FIELDS)[number];

export interface CertificateFilters {
  q?: string;
  status?: CertificateStatus;
  type?: string;
  model?: string;
  municipality?: string;
  uf?: string;
  responsible?: string;
  active?: boolean;
  archived?: boolean;
  dueFrom?: string;
  dueTo?: string;
  sort: SortableField | "status_priority";
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
}

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseCertificateFilters(searchParams: SearchParams): CertificateFilters {
  const page = Math.max(1, Number(firstValue(searchParams.page)) || 1);
  const pageSize = [25, 50, 100, 200].includes(Number(firstValue(searchParams.pageSize)))
    ? Number(firstValue(searchParams.pageSize))
    : 50;

  const sortParam = firstValue(searchParams.sort);
  const sort = (
    sortParam && (SORTABLE_FIELDS as readonly string[]).includes(sortParam)
      ? sortParam
      : "status_priority"
  ) as CertificateFilters["sort"];

  const dir = firstValue(searchParams.dir) === "desc" ? "desc" : "asc";

  return {
    q: firstValue(searchParams.q) || undefined,
    status: (firstValue(searchParams.status) as CertificateStatus) || undefined,
    type: firstValue(searchParams.type) || undefined,
    model: firstValue(searchParams.model) || undefined,
    municipality: firstValue(searchParams.municipality) || undefined,
    uf: firstValue(searchParams.uf) || undefined,
    responsible: firstValue(searchParams.responsible) || undefined,
    active: firstValue(searchParams.active) ? firstValue(searchParams.active) === "true" : undefined,
    archived: firstValue(searchParams.archived) ? firstValue(searchParams.archived) === "true" : undefined,
    dueFrom: firstValue(searchParams.dueFrom) || undefined,
    dueTo: firstValue(searchParams.dueTo) || undefined,
    sort,
    dir,
    page,
    pageSize,
  };
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Resolves a quick due-date filter (section 9) into a concrete [from, to] range. */
export function resolveDueQuickFilter(
  filter: DueQuickFilter,
  today = new Date()
): { dueFrom: string; dueTo: string } {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);

  switch (filter) {
    case "today":
      return { dueFrom: toISODate(start), dueTo: toISODate(start) };
    case "next_7":
    case "next_15":
    case "next_30":
    case "next_60":
    case "next_90": {
      const days = Number(filter.split("_")[1]);
      const end = new Date(start);
      end.setDate(end.getDate() + days);
      return { dueFrom: toISODate(start), dueTo: toISODate(end) };
    }
    case "this_month": {
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      return { dueFrom: toISODate(start), dueTo: toISODate(end) };
    }
    case "next_month": {
      const begin = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 2, 0);
      return { dueFrom: toISODate(begin), dueTo: toISODate(end) };
    }
    default:
      return { dueFrom: toISODate(start), dueTo: toISODate(start) };
  }
}
