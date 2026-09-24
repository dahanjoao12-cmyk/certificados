"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit/log";

export interface AlvaraTypeFormState {
  error?: string;
  success?: boolean;
}

async function requireAdmin(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." } as const;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return { error: "Apenas administradores podem gerenciar tipos de alvará." } as const;
  }
  return { userId: user.id } as const;
}

export async function createAlvaraType(
  _prevState: AlvaraTypeFormState,
  formData: FormData
): Promise<AlvaraTypeFormState> {
  const supabase = await createClient();
  const guard = await requireAdmin(supabase);
  if ("error" in guard) return { error: guard.error };

  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#2563eb").trim();
  if (!name) return { error: "Informe o nome do tipo." };

  const { data, error } = await supabase.from("alvara_types").insert({ name, color }).select("id").single();
  if (error) {
    if (error.code === "23505") return { error: "Já existe um tipo de alvará com esse nome." };
    return { error: "Não foi possível salvar o tipo de alvará." };
  }

  await logAudit(supabase, {
    userId: guard.userId,
    action: "create_alvara_type",
    entityType: "alvara_type",
    entityId: data.id,
    description: `criou o tipo de alvará "${name}"`,
  });

  revalidatePath("/configuracoes/alvara-tipos");
  return { success: true };
}

export async function updateAlvaraType(
  typeId: string,
  _prevState: AlvaraTypeFormState,
  formData: FormData
): Promise<AlvaraTypeFormState> {
  const supabase = await createClient();
  const guard = await requireAdmin(supabase);
  if ("error" in guard) return { error: guard.error };

  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "#2563eb").trim();
  if (!name) return { error: "Informe o nome do tipo." };

  const { error } = await supabase.from("alvara_types").update({ name, color }).eq("id", typeId);
  if (error) {
    if (error.code === "23505") return { error: "Já existe um tipo de alvará com esse nome." };
    return { error: "Não foi possível salvar as alterações." };
  }

  await logAudit(supabase, {
    userId: guard.userId,
    action: "update_alvara_type",
    entityType: "alvara_type",
    entityId: typeId,
    description: `atualizou o tipo de alvará "${name}"`,
  });

  revalidatePath("/configuracoes/alvara-tipos");
  return { success: true };
}

export async function deleteAlvaraType(typeId: string): Promise<void> {
  const supabase = await createClient();
  const guard = await requireAdmin(supabase);
  if ("error" in guard) throw new Error(guard.error);

  const { error } = await supabase.from("alvara_types").delete().eq("id", typeId);
  if (error) {
    if (error.code === "23503") {
      throw new Error("Este tipo está em uso por algum alvará -- não é possível excluir.");
    }
    throw new Error("Não foi possível excluir o tipo de alvará.");
  }

  await logAudit(supabase, {
    userId: guard.userId,
    action: "delete_alvara_type",
    entityType: "alvara_type",
    entityId: typeId,
    description: "excluiu um tipo de alvará",
  });

  revalidatePath("/configuracoes/alvara-tipos");
}
