"use server";

import { createClient } from "@/lib/supabase/server";

export async function getTablePreference(tableKey: string): Promise<string[] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_table_preferences")
    .select("columns")
    .eq("user_id", user.id)
    .eq("table_key", tableKey)
    .maybeSingle();

  return (data?.columns as string[] | undefined) ?? null;
}

export async function saveTablePreference(tableKey: string, columns: string[]): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("user_table_preferences")
    .upsert({ user_id: user.id, table_key: tableKey, columns, updated_at: new Date().toISOString() });
}
