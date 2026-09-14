import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildCsv } from "./csv";
import { buildXlsx } from "./xlsx";
import type { ExportCell } from "@/lib/certificates/export-value";

const columns = [
  { key: "code", label: "Código" },
  { key: "document", label: "CNPJ/CPF" },
  { key: "valid_to", label: "Vencimento" },
];

const rows: ExportCell[][] = [
  [
    { value: "1198", isText: true },
    { value: "68.702.974/0001-50", isText: true },
    { value: new Date(2027, 8, 10), isDate: true },
  ],
];

describe("buildCsv", () => {
  it("includes a header row and preserves values without reformatting", () => {
    const csv = buildCsv(columns, rows);
    expect(csv).toContain("Código;CNPJ/CPF;Vencimento");
    expect(csv).toContain("1198;68.702.974/0001-50;10/09/2027");
  });

  it("starts with a UTF-8 BOM so accented characters render correctly in Excel", () => {
    const csv = buildCsv(columns, rows);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it("quotes values containing the delimiter", () => {
    const csv = buildCsv(columns, [[{ value: "a;b" }, { value: "x" }, { value: null }]]);
    expect(csv).toContain('"a;b"');
  });
});

describe("buildXlsx", () => {
  it("writes the code/document columns as text (no scientific notation) and the date as a real date cell", async () => {
    const buffer = await buildXlsx(columns, rows);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];

    const headerRow = sheet.getRow(1);
    expect(headerRow.getCell(1).value).toBe("Código");
    expect(headerRow.font?.bold).toBe(true);

    const dataRow = sheet.getRow(2);
    expect(dataRow.getCell(1).value).toBe("1198");
    expect(dataRow.getCell(1).numFmt).toBe("@");
    expect(dataRow.getCell(2).value).toBe("68.702.974/0001-50");
    expect(dataRow.getCell(2).numFmt).toBe("@");
    expect(dataRow.getCell(3).value).toBeInstanceOf(Date);
    expect(dataRow.getCell(3).numFmt).toBe("dd/mm/yyyy");
  });

  it("never turns a long numeric-looking code into a number", async () => {
    const buffer = await buildXlsx(
      [{ key: "code", label: "Código" }],
      [[{ value: "00012345", isText: true }]]
    );
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const cell = workbook.worksheets[0].getRow(2).getCell(1);
    expect(cell.value).toBe("00012345");
    expect(typeof cell.value).toBe("string");
  });
});
