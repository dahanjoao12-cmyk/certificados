import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCertificateDigestEmails } from "@/lib/notifications/digest";

/**
 * Called daily by Vercel Cron (see vercel.json). No user session exists
 * here, so it needs the service-role client to read past RLS -- protected
 * by CRON_SECRET instead (Vercel sends it as a Bearer token automatically
 * once CRON_SECRET is set as an env var on the project).
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const result = await sendCertificateDigestEmails(supabase);
  return NextResponse.json(result);
}
