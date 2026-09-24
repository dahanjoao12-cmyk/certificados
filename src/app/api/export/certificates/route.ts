import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseCertificateFilters } from "@/lib/certificates/filters";
import { listAllCertificates } from "@/lib/certificates/queries";
import { EXPORTABLE_CERTIFICATE_COLUMNS, getCertificateExportValue } from "@/lib/certificates/export-value";
import { buildXlsx } from "@/lib/export/xlsx";
import { buildCsv } from "@/lib/export/csv";
import { logAudit } from "@/lib/audit/log";
import { notifyExportReady } from "@/lib/notifications/export-ready";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const format: "xlsx" | "csv" = body.format === "csv" ? "csv" : "xlsx";
  const requestedColumns: string[] = Array.isArray(body.columns) && body.columns.length > 0
    ? body.columns
    : EXPORTABLE_CERTIFICATE_COLUMNS.map((c) => c.key);
  const fileName: string = (body.fileName || "certificados").replace(/[^a-zA-Z0-9-_]/g, "_");

  const filters = parseCertificateFilters(body.filters ?? {});

  const validKeys = new Set(EXPORTABLE_CERTIFICATE_COLUMNS.map((c) => c.key));
  const columns = requestedColumns
    .filter((k) => validKeys.has(k))
    .map((k) => EXPORTABLE_CERTIFICATE_COLUMNS.find((c) => c.key === k)!);

  if (columns.length === 0) {
    return NextResponse.json({ error: "Selecione ao menos uma coluna." }, { status: 400 });
  }

  const rows = await listAllCertificates(supabase, filters);
  const cellRows = rows.map((row) => columns.map((col) => getCertificateExportValue(row, col.key)));

  await logAudit(supabase, {
    userId: user.id,
    action: "export",
    entityType: "certificates",
    description: `Exportou ${rows.length} certificado(s) para ${format.toUpperCase()}`,
    metadata: { format, columns: columns.map((c) => c.key), total: rows.length },
  });

  if (format === "csv") {
    const csv = buildCsv(columns, cellRows);
    await notifyExportReady(supabase, {
      userId: user.id,
      fileName: `${fileName}.csv`,
      body: csv,
      contentType: "text/csv; charset=utf-8",
    });
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}.csv"`,
      },
    });
  }

  const buffer = await buildXlsx(columns, cellRows);
  await notifyExportReady(supabase, {
    userId: user.id,
    fileName: `${fileName}.xlsx`,
    body: buffer,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}.xlsx"`,
    },
  });
}
