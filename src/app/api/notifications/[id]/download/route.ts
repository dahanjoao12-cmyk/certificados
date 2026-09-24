import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "exports";

/** Redirects to a short-lived signed URL for a notification's stored file (e.g. a past export). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: notification } = await supabase
    .from("notifications")
    .select("action_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!notification?.action_path) {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage.from(BUCKET).createSignedUrl(notification.action_path, 60);
  if (error || !signed) {
    return NextResponse.json({ error: "Não foi possível gerar o link do arquivo." }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
