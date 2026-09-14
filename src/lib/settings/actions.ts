"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit/log";

export interface SettingsFormState {
  error?: string;
  success?: boolean;
}

export async function saveCertificateThresholds(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return { error: "Apenas administradores podem alterar as configurações." };
  }

  const warningDays = Number(formData.get("warning_days"));
  if (!Number.isFinite(warningDays) || warningDays < 1 || warningDays > 365) {
    return { error: "Informe um número de dias válido (1 a 365)." };
  }

  const alertDaysRaw = formData.getAll("alert_days");
  const alertDays = alertDaysRaw.map((v) => Number(v)).filter((n) => Number.isFinite(n)).sort((a, b) => b - a);

  const { error } = await supabase.from("settings").upsert({
    key: "certificate_thresholds",
    value: { warning_days: warningDays, alert_days: alertDays },
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: "Não foi possível salvar as configurações." };
  }

  await logAudit(supabase, {
    userId: user.id,
    action: "update_settings",
    entityType: "settings",
    description: `atualizou as configurações de vencimento (aviso: ${warningDays} dias)`,
  });

  revalidatePath("/configuracoes");
  revalidatePath("/");
  return { success: true };
}
