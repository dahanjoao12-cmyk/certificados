import ExcelJS from "exceljs";
import type { ExportCell } from "@/lib/certificates/export-value";

export interface ExportColumn {
  key: string;
  label: string;
}

/**
 * Builds an .xlsx file respecting section 47's rules: CNPJ/code stay text
 * (never scientific notation), dates are real Excel dates (dd/mm/yyyy),
 * header row is bold, columns auto-width, no extra styling.
 */
export async function buildXlsx(
  columns: ExportColumn[],
  rows: ExportCell[][],
  sheetName = "Dados"
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Certificados Digitais";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns.map((col) => ({
    header: col.label,
    key: col.key,
    width: Math.min(40, Math.max(12, col.label.length + 4)),
  }));

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };

  for (const rowCells of rows) {
    const row = sheet.addRow(rowCells.map((c) => (c.isDate ? c.value : c.value ?? "")));
    rowCells.forEach((cell, index) => {
      const excelCell = row.getCell(index + 1);
      if (cell.isText) {
        excelCell.numFmt = "@";
        excelCell.value = cell.value === null ? "" : String(cell.value);
      } else if (cell.isDate && cell.value instanceof Date) {
        excelCell.numFmt = "dd/mm/yyyy";
        excelCell.value = cell.value;
      }
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
