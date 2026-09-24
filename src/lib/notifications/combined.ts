import type { SupabaseClient } from "@supabase/supabase-js";
import { listNotifications, type NotificationItem } from "./queries";
import { listActivityNotifications, type ActivityNotification } from "./activity";

export type CombinedNotification =
  | { kind: "due"; id: string; isRead: boolean; due: NotificationItem }
  | { kind: "activity"; id: string; isRead: boolean; activity: ActivityNotification };

/**
 * Merges the two notification sources this app has: due-date alerts
 * (certificates/alvarás vencendo -- always derived live, see
 * src/lib/notifications/queries.ts) and real stored activity events
 * (src/lib/notifications/activity.ts, e.g. "export_ready"). Activity items
 * come first (most recent on top); due-date alerts follow in their existing
 * urgency order.
 */
export async function listCombinedNotifications(supabase: SupabaseClient, userId: string): Promise<CombinedNotification[]> {
  const [dueItems, activityItems] = await Promise.all([
    listNotifications(supabase, userId),
    listActivityNotifications(supabase, userId),
  ]);

  const activity: CombinedNotification[] = activityItems.map((a) => ({
    kind: "activity" as const,
    id: `activity:${a.id}`,
    isRead: a.read_at !== null,
    activity: a,
  }));

  const due: CombinedNotification[] = dueItems.map((d) => ({
    kind: "due" as const,
    id: `due:${d.certificate.id}`,
    isRead: d.isRead,
    due: d,
  }));

  return [...activity, ...due];
}
