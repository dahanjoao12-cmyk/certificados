import Link from "next/link";
import { Download } from "lucide-react";
import type { ExportColumn } from "@/lib/export/xlsx";
import type { ExportCell } from "@/lib/certificates/export-value";
import type { AuxiliaryReportKind } from "@/lib/reports/auxiliary";

function formatCell(cell: ExportCell): string {
  if (cell.value === null || cell.value === undefined) return "-";
  if (cell.value instanceof Date) {
    const d = cell.value;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  return String(cell.value);
}

export function AuxiliaryTable({
  kind,
  title,
  description,
  columns,
  rows,
  toCells,
}: {
  kind: AuxiliaryReportKind;
  title: string;
  description: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  toCells: (row: Record<string, unknown>) => ExportCell[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/api/reports/export-auxiliary?kind=${kind}&format=xlsx`}
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
          >
            <Download size={14} /> Excel
          </Link>
          <Link
            href={`/api/reports/export-auxiliary?kind=${kind}&format=csv`}
            className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
          >
            <Download size={14} /> CSV
          </Link>
        </div>
      </div>

      <p className="text-xs text-slate-500">{rows.length.toLocaleString("pt-BR")} registro(s)</p>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="w-full min-w-max text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
              {columns.map((col) => (
                <th key={col.key} className="whitespace-nowrap px-4 py-2.5">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const cells = toCells(row);
              return (
                <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  {cells.map((cell, j) => (
                    <td key={j} className="whitespace-nowrap px-4 py-2.5 text-slate-700">
                      {formatCell(cell)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-slate-500">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
