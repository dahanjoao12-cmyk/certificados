"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { passwordResetEmailHtml } from "@/lib/email/templates";
import { appUrl } from "@/lib/utils/app-url";

export interface SetPasswordState {
  error?: string;
}

export interface RequestPasswordResetState {
  success?: boolean;
  error?: string;
}

/**
 * Always returns the same generic message whether or not the email exists
 * -- confirming/denying an account's existence to an anonymous caller is
 * exactly the info a password-reset form should never leak.
 */
export async function requestPasswordReset(
  _prevState: RequestPasswordResetState,
  formData: FormData
): Promise<RequestPasswordResetState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { error: "Informe seu e-mail." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${appUrl()}/auth/callback?next=/definir-senha` },
  });

  const resetLink = data?.properties?.action_link;
  if (!error && resetLink) {
    const fullName = (data.user?.user_metadata?.full_name as string | undefined) || email;
    await sendEmail({
      to: email,
      subject: "Redefinir senha — Certificados Digitais",
      html: passwordResetEmailHtml({ fullName, resetLink }),
    });
  }

  return { success: true };
}

/**
 * Used right after an invite/recovery link lands on /definir-senha: the
 * caller already has a real session (set by /auth/callback exchanging the
 * link's code), just no password yet.
 */
export async function setInitialPassword(
  _prevState: SetPasswordState,
  formData: FormData
): Promise<SetPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    return { error: "A senha precisa ter ao menos 8 caracteres." };
  }
  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Não foi possível definir a senha. Tente novamente." };
  }

  redirect("/");
}
