import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for every Supabase auth email link (invite, password
 * recovery, ...): exchanges the one-time `code` for a real session cookie,
 * then redirects to `next` (defaults to the dashboard). Listed in
 * PUBLIC_PATHS in src/lib/supabase/middleware.ts since there's no session
 * yet when this request arrives.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=convite_invalido`);
}
