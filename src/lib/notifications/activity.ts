import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityNotificationType = "export_ready";

export interface ActivityNotification {
  id: string;
  user_id: string;
  type: ActivityNotificationType;
  title: string;
  message: string;
  action_label: string | null;
  action_path: string | null;
  read_at: string | null;
  created_at: string;
}

/**
 * Real, stored notifications (as opposed to the certificate/alvará due-date
 * alerts, which are always derived live and never persisted). First and
 * only type today: an export finishing, with a link to download it again.
 */
export async function listActivityNotifications(
  supabase: SupabaseClient,
  userId: string
): Promise<ActivityNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as ActivityNotification[];
}

export async function createExportReadyNotification(
  supabase: SupabaseClient,
  params: { userId: string; fileName: string; storagePath: string }
): Promise<void> {
  await supabase.from("notifications").insert({
    user_id: params.userId,
    type: "export_ready",
    title: "Seu download está pronto!",
    message: `O arquivo ${params.fileName} está pronto para download.`,
    action_label: "Baixar",
    action_path: params.storagePath,
  });
}
