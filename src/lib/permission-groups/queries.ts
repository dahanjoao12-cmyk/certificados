import type { SupabaseClient } from "@supabase/supabase-js";
import type { PermissionGroup } from "@/lib/types/database";

export interface PermissionGroupWithModules extends PermissionGroup {
  module_keys: string[];
  member_count: number;
}

export async function listPermissionGroups(supabase: SupabaseClient): Promise<PermissionGroupWithModules[]> {
  const [{ data: groups }, { data: modules }, { data: members }] = await Promise.all([
    supabase.from("permission_groups").select("*").order("name"),
    supabase.from("permission_group_modules").select("group_id, module_key"),
    supabase.from("profiles").select("group_id").not("group_id", "is", null),
  ]);

  const modulesByGroup = new Map<string, string[]>();
  for (const row of modules ?? []) {
    const list = modulesByGroup.get(row.group_id) ?? [];
    list.push(row.module_key);
    modulesByGroup.set(row.group_id, list);
  }

  const countByGroup = new Map<string, number>();
  for (const row of members ?? []) {
    if (!row.group_id) continue;
    countByGroup.set(row.group_id, (countByGroup.get(row.group_id) ?? 0) + 1);
  }

  return ((groups ?? []) as PermissionGroup[]).map((group) => ({
    ...group,
    module_keys: modulesByGroup.get(group.id) ?? [],
    member_count: countByGroup.get(group.id) ?? 0,
  }));
}
