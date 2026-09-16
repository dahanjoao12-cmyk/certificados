import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email/send";
import { certificateDigestEmailHtml } from "@/lib/email/templates";
import { CERTIFICATE_STATUS_LABELS } from "@/lib/certificates/status";
import { appUrl } from "@/lib/utils/app-url";
import type { CertificateWithCompany } from "@/lib/types/database";

const ALERT_STATUSES = ["VENCIDO", "VENCE_HOJE", "VENCENDO"];

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export interface DigestResult {
  alertingCertificates: number;
  recipients: number;
  sent: number;
  failed: number;
  /** First failure's message, if any -- enough to diagnose without a log dive (Resend/env misconfiguration is the common case). */
  firstError?: string;
}

/**
 * One daily digest, same content for every active user (the app has no
 * per-user certificate ownership -- everyone can see everything, same as
 * the dashboard). Sends nothing when there is nothing to report; re-sends
 * every day a certificate stays in the alert window on purpose, mirroring
 * the in-app notification list rather than a one-shot dedup, since a daily
 * nag is the point for a compliance deadline.
 */
export async function sendCertificateDigestEmails(supabase: SupabaseClient): Promise<DigestResult> {
  const { data: certs } = await supabase
    .from("certificates_view")
    .select("*")
    .eq("archived", false)
    .in("status", ALERT_STATUSES)
    .order("status_priority", { ascending: true })
    .order("valid_to", { ascending: true });

  const rows = (certs ?? []) as CertificateWithCompany[];
  if (rows.length === 0) {
    return { alertingCertificates: 0, recipients: 0, sent: 0, failed: 0 };
  }

  const { data: profiles } = await supabase.from("profiles").select("full_name, email").eq("active", true);
  const recipients = profiles ?? [];

  const emailRows = rows.map((r) => ({
    companyName: r.company_corporate_name,
    companyCode: r.company_code,
    validTo: formatDate(r.valid_to),
    statusLabel: CERTIFICATE_STATUS_LABELS[r.status],
  }));

  let sent = 0;
  let failed = 0;
  let firstError: string | undefined;
  for (const recipient of recipients) {
    if (!recipient.email) continue;
    const result = await sendEmail({
      to: recipient.email,
      subject: `${rows.length} certificado(s) precisam de atenção`,
      html: certificateDigestEmailHtml({ fullName: recipient.full_name, rows: emailRows, appUrl: appUrl() }),
    });
    if (result.ok) {
      sent++;
    } else {
      failed++;
      firstError ??= result.error;
    }
  }

  return { alertingCertificates: rows.length, recipients: recipients.length, sent, failed, firstError };
}
