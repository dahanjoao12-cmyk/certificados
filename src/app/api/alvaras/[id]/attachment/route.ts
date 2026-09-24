import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "alvara-anexos";

/**
 * The bucket is private -- this is the only way to reach an attachment.
 * Redirects to a short-lived signed URL generated on the server, never
 * exposes a permanent/public link.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: alvara } = await supabase.from("alvaras").select("attachment_path").eq("id", id).maybeSingle();
  if (!alvara?.attachment_path) {
    return NextResponse.json({ error: "Nenhum anexo encontrado." }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrl(alvara.attachment_path, 60);
  if (error || !signed) {
    return NextResponse.json({ error: "Não foi possível gerar o link do anexo." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
