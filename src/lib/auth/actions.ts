"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { withBasePath } from "@/lib/utils/base-path";

export interface SetPasswordState {
  error?: string;
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
  if (!user) redirect(withBasePath("/login"));

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Não foi possível definir a senha. Tente novamente." };
  }

  redirect(withBasePath("/"));
}
