import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveEffectiveAttachment } from "@/lib/alvaras/queries";

const BUCKET = "alvara-anexos";

/**
 * The bucket is private -- this is the only way to reach an attachment.
 * Redirects to a short-lived signed URL generated on the server, never
 * exposes a permanent/public link. Resolves the TLE-style "shared by
 * município" fallback, so a sibling alvará's attachment downloads too.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: alvara } = await supabase
    .from("alvaras_view")
    .select("id, type_id, municipality, attachment_path, attachment_name, attachment_size, type_shared_attachment")
    .eq("id", id)
    .maybeSingle();
  if (!alvara) {
    return NextResponse.json({ error: "Alvará não encontrado." }, { status: 404 });
  }

  const effective = await resolveEffectiveAttachment(supabase, alvara, alvara.type_shared_attachment);
  if (!effective) {
    return NextResponse.json({ error: "Nenhum anexo encontrado." }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrl(effective.path, 60);
  if (error || !signed) {
    return NextResponse.json({ error: "Não foi possível gerar o link do anexo." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
