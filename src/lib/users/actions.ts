"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit/log";
import { sendEmail } from "@/lib/email/send";
import { inviteEmailHtml } from "@/lib/email/templates";
import { appUrl } from "@/lib/utils/app-url";

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
  const role = formData.get("role") === "admin" ? "admin" : "user";

  if (!email || !fullName) {
    return { error: "Preencha nome e e-mail." };
  }

  const admin = createAdminClient();

  // No password is collected here: generateLink creates the auth user in an
  // "invited" state and hands back a one-time link (never sent by Supabase
  // itself) that we email ourselves via Resend, matching the templates/
  // sender used for every other email the app sends. The user sets their
  // own password after following the link (see /auth/callback, /definir-senha).
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { full_name: fullName, role },
      redirectTo: `${appUrl()}/auth/callback?next=/definir-senha`,
    },
  });

  if (error) {
    return { error: error.message.includes("already been registered") ? "Já existe um usuário com este e-mail." : "Não foi possível convidar o usuário." };
  }

  const inviteLink = data.properties?.action_link;
  let emailWarning: string | null = null;
  if (inviteLink) {
    const sent = await sendEmail({
      to: email,
      subject: "Você foi convidado — Certificados Digitais",
      html: inviteEmailHtml({ fullName, inviteLink }),
    });
    if (!sent.ok) {
      emailWarning = `Usuário convidado, mas o e-mail falhou (${sent.error}). Link para compartilhar manualmente: ${inviteLink}`;
    }
  }

  await logAudit(supabase, {
    userId: user.id,
    action: "create_user",
    entityType: "profile",
    entityId: data.user?.id,
    description: `convidou o usuário ${fullName} (${email}, perfil ${role})`,
  });

  revalidatePath("/usuarios");
  if (emailWarning) return { error: emailWarning };
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
