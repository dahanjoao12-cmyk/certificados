import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseSpreadsheet } from "@/lib/import/parse";
import { processImportRows } from "@/lib/import/process";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const mappingRaw = formData.get("mapping");
  if (!(file instanceof File) || typeof mappingRaw !== "string") {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const mapping: Record<string, string> = JSON.parse(mappingRaw);
  if (!Object.values(mapping).includes("document")) {
    return NextResponse.json({ error: "Mapeie ao menos a coluna de CNPJ/CPF." }, { status: 400 });
  }

  const { rows } = await parseSpreadsheet(file);
  const summary = await processImportRows(supabase, rows, mapping, user.id, true);

  return NextResponse.json({
    totalRows: summary.totalRows,
    companiesCreated: summary.companiesCreated,
    companiesUpdated: summary.companiesUpdated,
    certificatesCreated: summary.certificatesCreated,
    duplicates: summary.duplicates,
    conflicts: summary.conflicts,
    errors: summary.errors,
    rows: summary.rows.slice(0, 500),
  });
}
