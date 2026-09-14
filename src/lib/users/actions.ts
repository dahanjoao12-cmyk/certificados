"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit/log";

export interface UserFormState {
  error?: string;
  success?: boolean;
}

async function requireAdminCaller() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { supabase, user, isAdmin: profile?.role === "admin" };
}

export async function createUser(_prevState: UserFormState, formData: FormData): Promise<UserFormState> {
  const { supabase, user, isAdmin } = await requireAdminCaller();
  if (!user || !isAdmin) {
    return { error: "Apenas administradores podem criar usuários." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = formData.get("role") === "admin" ? "admin" : "user";

  if (!email || !fullName || password.length < 8) {
    return { error: "Preencha nome, e-mail e uma senha com ao menos 8 caracteres." };
  }

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (error) {
    return { error: error.message.includes("already been registered") ? "Já existe um usuário com este e-mail." : "Não foi possível criar o usuário." };
  }

  await logAudit(supabase, {
    userId: user.id,
    action: "create_user",
    entityType: "profile",
    entityId: created.user?.id,
    description: `criou o usuário ${fullName} (${email}, perfil ${role})`,
  });

  revalidatePath("/usuarios");
  return { success: true };
}

export async function setUserActive(profileId: string, active: boolean): Promise<void> {
  const { supabase, user, isAdmin } = await requireAdminCaller();
  if (!user || !isAdmin) throw new Error("Apenas administradores podem gerenciar usuários.");

  await supabase.from("profiles").update({ active }).eq("id", profileId);

  await logAudit(supabase, {
    userId: user.id,
    action: active ? "activate_user" : "deactivate_user",
    entityType: "profile",
    entityId: profileId,
    description: active ? "reativou um usuário" : "desativou um usuário",
  });

  revalidatePath("/usuarios");
}

export async function setUserRole(profileId: string, role: "admin" | "user"): Promise<void> {
  const { supabase, user, isAdmin } = await requireAdminCaller();
  if (!user || !isAdmin) throw new Error("Apenas administradores podem gerenciar usuários.");

  await supabase.from("profiles").update({ role }).eq("id", profileId);

  await logAudit(supabase, {
    userId: user.id,
    action: "change_user_role",
    entityType: "profile",
    entityId: profileId,
    description: `alterou o perfil de um usuário para ${role}`,
  });

  revalidatePath("/usuarios");
}
