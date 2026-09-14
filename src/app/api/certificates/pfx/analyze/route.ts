import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parsePfx, PfxParseError } from "@/lib/pfx/parse";
import { searchCompanies } from "@/lib/companies/search";
import { normalizeDocument } from "@/lib/documents/document";

export const runtime = "nodejs";

/**
 * Receives a .pfx/.p12 upload + password, parses it in memory, and returns
 * ONLY the extracted metadata. The file bytes and password exist solely as
 * local variables of this request and are discarded when the function
 * returns -- nothing is written to disk, storage, or logs.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  const password = formData.get("password");

  if (!(file instanceof File) || typeof password !== "string" || !password) {
    return NextResponse.json({ error: "Selecione um arquivo e informe a senha." }, { status: 400 });
  }
  if (!/\.(pfx|p12)$/i.test(file.name)) {
    return NextResponse.json({ error: "Envie um arquivo .pfx ou .p12." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Arquivo muito grande." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const metadata = parsePfx(buffer, password);

    let matchedCompany = null;
    if (metadata.extractedDocument) {
      const normalized = normalizeDocument(metadata.extractedDocument);
      const results = await searchCompanies(supabase, normalized, 1);
      matchedCompany = results.find((c) => c.document === normalized) ?? null;
    }

    return NextResponse.json({ metadata, matchedCompany });
  } catch (err) {
    if (err instanceof PfxParseError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Falha ao processar o certificado." }, { status: 400 });
  }
}
