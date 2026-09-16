import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendCertificateDigestEmails } from "@/lib/notifications/digest";

/**
 * Called daily by a scheduler with no user session -- Vercel Cron (see
 * vercel.json, sends GET) or a plain system crontab hitting this over
 * curl (GET or POST both work). Needs the service-role client to read past
 * RLS, protected by CRON_SECRET as a Bearer token instead.
 */
async function handleCronNotify(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const result = await sendCertificateDigestEmails(supabase);
  return NextResponse.json(result);
}

export { handleCronNotify as GET, handleCronNotify as POST };
