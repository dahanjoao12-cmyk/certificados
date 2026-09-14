import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getReportColumns,
  getDefaultReportColumns,
  runReport,
  REPORT_BASE_LABELS,
  type ReportBase,
} from "@/lib/reports/engine";
import { resolveVisibleColumns as resolveGeneric } from "@/lib/certificates/columns";
import { getTablePreference } from "@/lib/table-preferences/actions";
import { ReportFilterForm } from "@/components/reports/report-filter-form";
import { ReportTable } from "@/components/reports/report-table";
import { ColumnPicker } from "@/components/dashboard/column-picker";
import { ReportExportDialog } from "@/components/reports/report-export-dialog";
import { SavePresetForm } from "@/components/reports/save-preset-form";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ReportBuilderPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const base: ReportBase = params.base === "companies" ? "companies" : "certificates";
  const tableKey = `report_${base}`;

  const allColumns = getReportColumns(base);

  let visibleKeys: string[] | undefined;
  const colsParam = params.cols;
  if (typeof colsParam === "string" && colsParam.length > 0) {
    visibleKeys = colsParam.split(",");
  } else {
    visibleKeys = (await getTablePreference(tableKey)) ?? undefined;
  }
  const defaultColumns = getDefaultReportColumns(base);
  const resolvedKeys = (visibleKeys && visibleKeys.length > 0 ? visibleKeys : defaultColumns).filter((k) =>
    allColumns.some((c) => c.key === k)
  );
  const visibleColumns = resolvedKeys.length > 0
    ? resolveGeneric(resolvedKeys)
    : resolveGeneric(defaultColumns);

  const supabase = await createClient();
  const { rows, total } = await runReport(supabase, base, params);

  const baseHref = (target: ReportBase) => {
    const p = new URLSearchParams();
    p.set("base", target);
    return `/relatorios/novo?${p.toString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Construtor de relatórios</h1>
          <p className="text-sm text-slate-500">Escolha a base, aplique filtros, selecione colunas e exporte.</p>
        </div>
        <Link href="/relatorios" className="text-xs text-slate-500 hover:text-slate-900">
          ← Relatórios
        </Link>
      </div>

      <div className="flex gap-2">
        {(Object.keys(REPORT_BASE_LABELS) as ReportBase[]).map((option) => (
          <Link
            key={option}
            href={baseHref(option)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              option === base ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-inset ring-slate-300"
            }`}
          >
            {REPORT_BASE_LABELS[option]}
          </Link>
        ))}
      </div>

      <ReportFilterForm base={base} searchParams={params} />

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{total.toLocaleString("pt-BR")} registro(s) encontrado(s)</p>
        <div className="flex items-center gap-2">
          <SavePresetForm base={base} columns={visibleColumns.map((c) => c.key)} />
          <ColumnPicker allColumns={allColumns} visibleKeys={visibleColumns.map((c) => c.key)} tableKey={tableKey} />
          <ReportExportDialog base={base} allColumns={allColumns} visibleColumns={visibleColumns.map((c) => c.key)} />
        </div>
      </div>

      <ReportTable base={base} rows={rows} columns={visibleColumns} />

      {total > rows.length && (
        <p className="text-xs text-slate-400">
          Mostrando os primeiros {rows.length} de {total} registros nesta prévia. A exportação inclui todos os
          registros filtrados.
        </p>
      )}
    </div>
  );
}
