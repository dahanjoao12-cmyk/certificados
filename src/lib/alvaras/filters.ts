import type { AlvaraStatus } from "@/lib/types/database";

export const SORTABLE_FIELDS = [
  "company_code",
  "company_corporate_name",
  "type_name",
  "valid_to",
  "days_remaining",
  "status",
  "created_at",
] as const;
export type SortableField = (typeof SORTABLE_FIELDS)[number];

export interface AlvaraFilters {
  q?: string;
  status?: AlvaraStatus;
  typeId?: string;
  prioritario?: boolean;
  archived?: boolean;
  uf?: string;
  municipality?: string;
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

export function parseAlvaraFilters(searchParams: SearchParams): AlvaraFilters {
  const page = Math.max(1, Number(firstValue(searchParams.page)) || 1);
  const pageSize = [25, 50, 100, 200].includes(Number(firstValue(searchParams.pageSize)))
    ? Number(firstValue(searchParams.pageSize))
    : 50;

  const sortParam = firstValue(searchParams.sort);
  const sort = (
    sortParam && (SORTABLE_FIELDS as readonly string[]).includes(sortParam)
      ? sortParam
      : "status_priority"
  ) as AlvaraFilters["sort"];

  const dir = firstValue(searchParams.dir) === "desc" ? "desc" : "asc";

  return {
    q: firstValue(searchParams.q) || undefined,
    status: (firstValue(searchParams.status) as AlvaraStatus) || undefined,
    typeId: firstValue(searchParams.typeId) || undefined,
    prioritario: firstValue(searchParams.prioritario) ? firstValue(searchParams.prioritario) === "true" : undefined,
    archived: firstValue(searchParams.archived) ? firstValue(searchParams.archived) === "true" : undefined,
    uf: firstValue(searchParams.uf) || undefined,
    municipality: firstValue(searchParams.municipality) || undefined,
    dueFrom: firstValue(searchParams.dueFrom) || undefined,
    dueTo: firstValue(searchParams.dueTo) || undefined,
    sort,
    dir,
    page,
    pageSize,
  };
}
