import type { SupabaseClient } from "@supabase/supabase-js";
import type { CertificateWithCompany } from "@/lib/types/database";

export interface NotificationItem {
  certificate: CertificateWithCompany;
  isRead: boolean;
}

const ALERT_STATUSES = ["VENCIDO", "VENCE_HOJE", "VENCENDO"];

/**
 * Notifications are not stored rows -- they are derived from
 * certificates_view (status). notification_reads only tracks which
 * certificate each user has already dismissed, so an alert "stays available
 * until viewed or marked as read" per user.
 */
export async function listNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<NotificationItem[]> {
  const [{ data: certs }, { data: reads }] = await Promise.all([
    supabase
      .from("certificates_view")
      .select("*")
      .eq("archived", false)
      .in("status", ALERT_STATUSES)
      .order("status_priority", { ascending: true })
      .order("valid_to", { ascending: true }),
    supabase.from("notification_reads").select("certificate_id").eq("user_id", userId),
  ]);

  const readIds = new Set((reads ?? []).map((r) => r.certificate_id as string));

  return ((certs ?? []) as CertificateWithCompany[]).map((certificate) => ({
    certificate,
    isRead: readIds.has(certificate.id),
  }));
}
