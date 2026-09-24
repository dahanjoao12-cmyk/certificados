"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit/log";

export interface GroupFormState {
  error?: string;
  success?: boolean;
}

async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Apenas administradores podem gerenciar grupos." };

  return { userId: user.id };
}

export async function createPermissionGroup(
  _prevState: GroupFormState,
  formData: FormData
): Promise<GroupFormState> {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe um nome para o grupo." };

  const moduleKeys = formData.getAll("module_keys").map(String);

  const supabase = await createClient();
  const { data: group, error } = await supabase
    .from("permission_groups")
    .insert({ name, created_by: guard.userId })
    .select("id")
    .single();

  if (error || !group) {
    return { error: "Não foi possível criar o grupo." };
  }

  if (moduleKeys.length > 0) {
    await supabase
      .from("permission_group_modules")
      .insert(moduleKeys.map((module_key) => ({ group_id: group.id, module_key })));
  }

  await logAudit(supabase, {
    userId: guard.userId,
    action: "create_permission_group",
    entityType: "permission_group",
    entityId: group.id,
    description: `criou o grupo de usuários "${name}"`,
  });

  revalidatePath("/configuracoes/grupos");
  return { success: true };
}

export async function updatePermissionGroup(
  groupId: string,
  _prevState: GroupFormState,
  formData: FormData
): Promise<GroupFormState> {
  const guard = await requireAdmin();
  if ("error" in guard) return { error: guard.error };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe um nome para o grupo." };

  const moduleKeys = formData.getAll("module_keys").map(String);

  const supabase = await createClient();
  const { error } = await supabase.from("permission_groups").update({ name }).eq("id", groupId);
  if (error) return { error: "Não foi possível salvar o grupo." };

  // No UPDATE policy on permission_group_modules on purpose (nothing upserts
  // it) -- replace the set with a delete + insert instead.
  await supabase.from("permission_group_modules").delete().eq("group_id", groupId);
  if (moduleKeys.length > 0) {
    await supabase
      .from("permission_group_modules")
      .insert(moduleKeys.map((module_key) => ({ group_id: groupId, module_key })));
  }

  await logAudit(supabase, {
    userId: guard.userId,
    action: "update_permission_group",
    entityType: "permission_group",
    entityId: groupId,
    description: `atualizou o grupo de usuários "${name}"`,
  });

  revalidatePath("/configuracoes/grupos");
  return { success: true };
}

export async function deletePermissionGroup(groupId: string): Promise<void> {
  const guard = await requireAdmin();
  if ("error" in guard) throw new Error(guard.error);

  const supabase = await createClient();
  await supabase.from("permission_groups").delete().eq("id", groupId);

  await logAudit(supabase, {
    userId: guard.userId,
    action: "delete_permission_group",
    entityType: "permission_group",
    entityId: groupId,
    description: "excluiu um grupo de usuários",
  });

  revalidatePath("/configuracoes/grupos");
  revalidatePath("/usuarios");
}
