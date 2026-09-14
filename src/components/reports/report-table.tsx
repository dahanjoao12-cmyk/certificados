import { getExportValue, type ReportBase } from "@/lib/reports/engine";
import type { ColumnDef } from "@/lib/certificates/columns";

function formatCellValue(value: string | number | Date | null): string {
  if (value === null || value === undefined) return "-";
  if (value instanceof Date) {
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${value.getFullYear()}`;
  }
  return String(value);
}

export function ReportTable({
  base,
  rows,
  columns,
}: {
  base: ReportBase;
  rows: Record<string, unknown>[];
  columns: ColumnDef[];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-white py-16 text-center">
        <p className="text-sm text-slate-500">Nenhum registro encontrado com os filtros atuais.</p>
      </div>
    );
  }

  return (
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
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              {columns.map((col) => (
                <td key={col.key} className="whitespace-nowrap px-4 py-2.5 text-slate-700">
                  {formatCellValue(getExportValue(base, row, col.key).value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
