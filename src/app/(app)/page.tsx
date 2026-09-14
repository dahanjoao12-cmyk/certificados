import { createClient } from "@/lib/supabase/server";
import { parseCertificateFilters } from "@/lib/certificates/filters";
import { getCertificateStatusCounts, listCertificates } from "@/lib/certificates/queries";
import { CERTIFICATE_COLUMNS, CERTIFICATE_TABLE_KEY, resolveVisibleColumns } from "@/lib/certificates/columns";
import { getTablePreference } from "@/lib/table-preferences/actions";
import { StatusCards } from "@/components/dashboard/status-cards";
import { FiltersBar } from "@/components/dashboard/filters-bar";
import { CertificatesTable } from "@/components/dashboard/certificates-table";
import { Pagination } from "@/components/dashboard/pagination";
import { ColumnPicker } from "@/components/dashboard/column-picker";
import { ExportDialog } from "@/components/dashboard/export-dialog";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const filters = parseCertificateFilters(params);

  const supabase = await createClient();

  let visibleKeys: string[] | undefined;
  const colsParam = params.cols;
  if (typeof colsParam === "string" && colsParam.length > 0) {
    visibleKeys = colsParam.split(",");
  } else {
    visibleKeys = (await getTablePreference(CERTIFICATE_TABLE_KEY)) ?? undefined;
  }
  const visibleColumns = resolveVisibleColumns(visibleKeys);

  const [counts, { rows, total }] = await Promise.all([
    getCertificateStatusCounts(supabase),
    listCertificates(supabase, filters),
  ]);

  const currentQuery = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      value === undefined ? [] : Array.isArray(value) ? value.map((v) => [key, v] as [string, string]) : [[key, value] as [string, string]]
    )
  ).toString();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Certificados Digitais</h1>
        <p className="text-sm text-slate-500">Gerencie os certificados digitais dos clientes.</p>
      </div>

      <StatusCards
        counts={counts}
        currentQuery={currentQuery}
        activeStatus={filters.status}
        activeArchived={params.archived as string | undefined}
      />

      <FiltersBar />

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {total.toLocaleString("pt-BR")} certificado(s) encontrado(s)
        </p>
        <div className="flex items-center gap-2">
          <ColumnPicker
            allColumns={CERTIFICATE_COLUMNS}
            visibleKeys={visibleColumns.map((c) => c.key)}
            tableKey={CERTIFICATE_TABLE_KEY}
          />
          <ExportDialog defaultVisibleColumns={visibleColumns.map((c) => c.key)} />
        </div>
      </div>

      <CertificatesTable
        rows={rows}
        columns={visibleColumns}
        sort={filters.sort}
        dir={filters.dir}
        currentQuery={currentQuery}
      />

      <Pagination page={filters.page} pageSize={filters.pageSize} total={total} currentQuery={currentQuery} />
    </div>
  );
}
