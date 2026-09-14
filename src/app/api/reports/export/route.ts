import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getExportValue, getReportColumns, runReportAll, type ReportBase } from "@/lib/reports/engine";
import { buildXlsx } from "@/lib/export/xlsx";
import { buildCsv } from "@/lib/export/csv";
import { logAudit } from "@/lib/audit/log";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json();
  const base: ReportBase = body.base === "companies" ? "companies" : "certificates";
  const format: "xlsx" | "csv" = body.format === "csv" ? "csv" : "xlsx";
  const fileName: string = (body.fileName || "relatorio").replace(/[^a-zA-Z0-9-_]/g, "_");
  const filters: Record<string, string> = body.filters ?? {};

  const allColumns = getReportColumns(base);
  const validKeys = new Set(allColumns.map((c) => c.key));
  const requestedColumns: string[] = Array.isArray(body.columns) && body.columns.length > 0
    ? body.columns
    : allColumns.map((c) => c.key);
  const columns = requestedColumns.filter((k) => validKeys.has(k)).map((k) => allColumns.find((c) => c.key === k)!);

  if (columns.length === 0) {
    return NextResponse.json({ error: "Selecione ao menos uma coluna." }, { status: 400 });
  }

  const rows = await runReportAll(supabase, base, filters);
  const cellRows = rows.map((row) => columns.map((col) => getExportValue(base, row, col.key)));

  await logAudit(supabase, {
    userId: user.id,
    action: "export",
    entityType: base,
    description: `Exportou relatório de ${base === "companies" ? "empresas" : "certificados"} (${rows.length} registro(s)) para ${format.toUpperCase()}`,
    metadata: { format, columns: columns.map((c) => c.key), total: rows.length },
  });

  if (format === "csv") {
    const csv = buildCsv(columns, cellRows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}.csv"`,
      },
    });
  }

  const buffer = await buildXlsx(columns, cellRows);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}.xlsx"`,
    },
  });
}
