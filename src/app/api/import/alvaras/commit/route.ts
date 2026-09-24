import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseSpreadsheet } from "@/lib/import/parse";
import { processAlvaraImportRows } from "@/lib/alvaras/import";
import { logAudit } from "@/lib/audit/log";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const mappingRaw = formData.get("mapping");
  const fileName =
    typeof formData.get("fileName") === "string" ? String(formData.get("fileName")) : file instanceof File ? file.name : "arquivo";

  if (!(file instanceof File) || typeof mappingRaw !== "string") {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const mapping: Record<string, string> = JSON.parse(mappingRaw);
  if (!Object.values(mapping).includes("document")) {
    return NextResponse.json({ error: "Mapeie ao menos a coluna de CNPJ/CPF." }, { status: 400 });
  }

  const { rows } = await parseSpreadsheet(file);

  const { data: importRun, error: importError } = await supabase
    .from("alvara_imports")
    .insert({
      file_name: fileName,
      mapping,
      total_rows: rows.length,
      status: "processing",
      imported_by: user.id,
    })
    .select("id")
    .single();

  if (importError || !importRun) {
    return NextResponse.json({ error: "Falha ao registrar a importação." }, { status: 500 });
  }

  const summary = await processAlvaraImportRows(supabase, rows, mapping, user.id, false);

  await supabase
    .from("alvara_imports")
    .update({
      alvaras_created: summary.alvarasCreated,
      alvaras_updated: summary.alvarasUpdated,
      types_created: summary.typesCreated,
      errors: summary.errors,
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", importRun.id);

  if (summary.rows.length > 0) {
    const chunkSize = 500;
    for (let i = 0; i < summary.rows.length; i += chunkSize) {
      const chunk = summary.rows.slice(i, i + chunkSize).map((row) => ({
        import_id: importRun.id,
        row_number: row.rowNumber,
        raw_data: row.rawData,
        result: row.result,
        message: row.message,
        company_id: row.companyId ?? null,
        alvara_id: row.alvaraId ?? null,
      }));
      await supabase.from("alvara_import_rows").insert(chunk);
    }
  }

  await logAudit(supabase, {
    userId: user.id,
    action: "import_alvaras",
    entityType: "alvara_import",
    entityId: importRun.id,
    description: `importou ${fileName} (${summary.totalRows} linhas: ${summary.alvarasCreated} alvarás criados, ${summary.alvarasUpdated} atualizados, ${summary.typesCreated} tipos criados)`,
  });

  return NextResponse.json({ importId: importRun.id, ...summary });
}
