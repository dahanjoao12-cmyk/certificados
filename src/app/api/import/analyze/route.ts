import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseSpreadsheet } from "@/lib/import/parse";
import { suggestFieldForHeader } from "@/lib/import/fields";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const allowedExtensions = [".xlsx", ".xls", ".csv"];
  if (!allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))) {
    return NextResponse.json({ error: "Formato não suportado. Use .xlsx, .xls ou .csv." }, { status: 400 });
  }

  try {
    const { headers, rows } = await parseSpreadsheet(file);
    if (headers.length === 0) {
      return NextResponse.json({ error: "Não foi possível ler colunas no arquivo." }, { status: 400 });
    }

    const suggestions: Record<string, string | null> = {};
    for (const header of headers) {
      suggestions[header] = suggestFieldForHeader(header);
    }

    return NextResponse.json({
      headers,
      suggestions,
      rowCount: rows.length,
      sampleRows: rows.slice(0, 5),
    });
  } catch {
    return NextResponse.json({ error: "Falha ao processar o arquivo. Verifique se ele não está corrompido." }, { status: 400 });
  }
}
