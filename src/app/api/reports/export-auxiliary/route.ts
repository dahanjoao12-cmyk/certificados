import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadAuxiliaryReport, type AuxiliaryReportKind } from "@/lib/reports/auxiliary";
import { buildXlsx } from "@/lib/export/xlsx";
import { buildCsv } from "@/lib/export/csv";

const VALID_KINDS: AuxiliaryReportKind[] = ["sem_certificado", "multiplos_certificados", "renovacoes", "auditoria"];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const kind = request.nextUrl.searchParams.get("kind") as AuxiliaryReportKind;
  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "xlsx";
  if (!VALID_KINDS.includes(kind)) {
    return NextResponse.json({ error: "Relatório inválido." }, { status: 400 });
  }

  const report = await loadAuxiliaryReport(supabase, kind);
  const cellRows = report.rows.map((row) => report.toCells(row));

  if (format === "csv") {
    const csv = buildCsv(report.columns, cellRows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${kind}.csv"`,
      },
    });
  }

  const buffer = await buildXlsx(report.columns, cellRows);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${kind}.xlsx"`,
    },
  });
}
