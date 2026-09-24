"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(certificateId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("notification_reads")
    .upsert({ certificate_id: certificateId, user_id: user.id }, { onConflict: "certificate_id,user_id" });

  revalidatePath("/notificacoes");
  revalidatePath("/");
}

export async function markAllNotificationsRead(certificateIds: string[]): Promise<void> {
  if (certificateIds.length === 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("notification_reads")
    .upsert(
      certificateIds.map((certificateId) => ({ certificate_id: certificateId, user_id: user.id })),
      { onConflict: "certificate_id,user_id" }
    );

  revalidatePath("/notificacoes");
  revalidatePath("/");
}

/** Marks one activity notification (e.g. "export_ready") as read -- see src/lib/notifications/activity.ts. */
export async function markActivityNotificationRead(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/notificacoes");
  revalidatePath("/");
}

export async function markAllActivityNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .eq("user_id", user.id);

  revalidatePath("/notificacoes");
  revalidatePath("/");
}
