import type { ExportCell } from "@/lib/certificates/export-value";
import type { ExportColumn } from "./xlsx";

function formatCellForCsv(cell: ExportCell): string {
  if (cell.value === null || cell.value === undefined) return "";
  if (cell.isDate && cell.value instanceof Date) {
    const d = cell.value;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${d.getFullYear()}`;
  }
  return String(cell.value);
}

function escapeCsvValue(value: string): string {
  if (/[",;\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Builds a semicolon-separated CSV (pt-BR Excel default) with a UTF-8 BOM so accents render correctly. */
export function buildCsv(columns: ExportColumn[], rows: ExportCell[][]): string {
  const header = columns.map((c) => escapeCsvValue(c.label)).join(";");
  const lines = rows.map((rowCells) =>
    rowCells.map((cell) => escapeCsvValue(formatCellForCsv(cell))).join(";")
  );
  return "﻿" + [header, ...lines].join("\r\n");
}
