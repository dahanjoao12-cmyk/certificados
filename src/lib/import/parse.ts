import ExcelJS from "exceljs";
import Papa from "papaparse";

export interface ParsedSpreadsheet {
  headers: string[];
  rows: Record<string, string>[];
}

/** Parses an uploaded .xlsx/.xls/.csv file into headers + row objects (first row = header). */
export async function parseSpreadsheet(file: File): Promise<ParsedSpreadsheet> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".csv")) {
    return parseCsv(buffer);
  }
  return parseExcel(buffer);
}

function parseCsv(buffer: Buffer): ParsedSpreadsheet {
  const text = buffer.toString("utf-8").replace(/^﻿/, "");
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    delimiter: text.includes(";") && !text.includes(",") ? ";" : undefined,
    transformHeader: (h) => h.trim(),
  });

  const headers = result.meta.fields ?? [];
  const rows = result.data.map((row) => {
    const clean: Record<string, string> = {};
    for (const key of headers) {
      clean[key] = (row[key] ?? "").toString().trim();
    }
    return clean;
  });

  return { headers, rows };
}

async function parseExcel(buffer: Buffer): Promise<ParsedSpreadsheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? "").trim();
  });

  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const cell = row.getCell(index + 1);
      const raw = cellToString(cell.value);
      if (raw) hasValue = true;
      values[header] = raw;
    });
    if (hasValue) rows.push(values);
  });

  return { headers: headers.filter(Boolean), rows };
}

function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    const day = String(value.getDate()).padStart(2, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}/${value.getFullYear()}`;
  }
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return String(value.result ?? "");
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }
  }
  return String(value).trim();
}
