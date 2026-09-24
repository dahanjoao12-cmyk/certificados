import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { parseAlvaraFilters } from "@/lib/alvaras/filters";
import { getAlvaraStatusCounts, listAlvaras, listAlvaraTypes } from "@/lib/alvaras/queries";
import { ALVARA_COLUMNS, ALVARA_TABLE_KEY, resolveVisibleColumns } from "@/lib/alvaras/columns";
import { getTablePreference } from "@/lib/table-preferences/actions";
import { AlvaraStatusCards } from "@/components/alvaras/status-cards";
import { AlvarasFiltersBar } from "@/components/alvaras/filters-bar";
import { AlvarasTable } from "@/components/alvaras/alvaras-table";
import { Pagination } from "@/components/dashboard/pagination";
import { ColumnPicker } from "@/components/dashboard/column-picker";
import { AlvaraExportDialog } from "@/components/alvaras/export-dialog";
import { NewAlvaraCompanyPicker } from "@/components/alvaras/new-alvara-company-picker";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AlvarasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = parseAlvaraFilters(params);

  const supabase = await createClient();

  let visibleKeys: string[] | undefined;
  const colsParam = params.cols;
  if (typeof colsParam === "string" && colsParam.length > 0) {
    visibleKeys = colsParam.split(",");
  } else {
    visibleKeys = (await getTablePreference(ALVARA_TABLE_KEY)) ?? undefined;
  }
  const visibleColumns = resolveVisibleColumns(visibleKeys);

  const [user, counts, { rows, total }, types] = await Promise.all([
    getCurrentUser(),
    getAlvaraStatusCounts(supabase),
    listAlvaras(supabase, filters),
    listAlvaraTypes(supabase),
  ]);

  const currentQuery = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      value === undefined ? [] : Array.isArray(value) ? value.map((v) => [key, v] as [string, string]) : [[key, value] as [string, string]]
    )
  ).toString();

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Alvarás</h1>
          <p className="text-sm text-slate-500">Controle de validade de alvarás e licenças municipais.</p>
        </div>
        <NewAlvaraCompanyPicker />
      </div>

      <AlvaraStatusCards
        counts={counts}
        currentQuery={currentQuery}
        activeStatus={filters.status}
        activeArchived={params.archived as string | undefined}
      />

      <AlvarasFiltersBar types={types} />

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{total.toLocaleString("pt-BR")} alvará(s) encontrado(s)</p>
        <div className="flex items-center gap-2">
          <ColumnPicker allColumns={ALVARA_COLUMNS} visibleKeys={visibleColumns.map((c) => c.key)} tableKey={ALVARA_TABLE_KEY} />
          <AlvaraExportDialog defaultVisibleColumns={visibleColumns.map((c) => c.key)} />
        </div>
      </div>

      <AlvarasTable
        rows={rows}
        columns={visibleColumns}
        sort={filters.sort}
        dir={filters.dir}
        currentQuery={currentQuery}
        isAdmin={user.profile.role === "admin"}
      />

      <Pagination page={filters.page} pageSize={filters.pageSize} total={total} currentQuery={currentQuery} />
    </div>
  );
}
