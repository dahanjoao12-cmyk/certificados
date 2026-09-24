"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit/log";
import { sendCertificateDigestEmails } from "@/lib/notifications/digest";
import { getOrganizationInfo } from "@/lib/settings/organization";
import { validateDocument } from "@/lib/documents/document";

export interface SettingsFormState {
  error?: string;
  success?: boolean;
}

export interface DigestFormState {
  error?: string;
  success?: string;
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

export async function saveOrganizationInfo(
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
    return { error: "Apenas administradores podem alterar os dados da organização." };
  }

  const corporateName = String(formData.get("corporate_name") ?? "").trim();
  if (!corporateName) {
    return { error: "Informe a razão social." };
  }

  const current = await getOrganizationInfo(supabase);

  // CNPJ is locked once set: the form disables the input client-side, but a
  // request can't be trusted to respect that -- always keep the stored value
  // once there is one, only accepting a new CNPJ the first time.
  let cnpj = current.cnpj;
  if (!cnpj) {
    const rawCnpj = String(formData.get("cnpj") ?? "").trim();
    if (!rawCnpj) {
      return { error: "Informe o CNPJ." };
    }
    const validation = validateDocument(rawCnpj);
    if (!validation.valid || validation.type !== "cnpj") {
      return { error: "CNPJ inválido." };
    }
    cnpj = validation.normalized;
  }

  const value = {
    cnpj,
    corporate_name: corporateName,
    trade_name: String(formData.get("trade_name") ?? "").trim() || null,
    zip_code: String(formData.get("zip_code") ?? "").trim() || null,
    address_street: String(formData.get("address_street") ?? "").trim() || null,
    address_number: String(formData.get("address_number") ?? "").trim() || null,
    address_complement: String(formData.get("address_complement") ?? "").trim() || null,
    neighborhood: String(formData.get("neighborhood") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    uf: String(formData.get("uf") ?? "").trim().toUpperCase() || null,
  };

  const { error } = await supabase.from("settings").upsert({
    key: "organization_info",
    value,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { error: "Não foi possível salvar os dados da organização." };
  }

  await logAudit(supabase, {
    userId: user.id,
    action: "update_settings",
    entityType: "settings",
    description: "atualizou os dados de Minha Organização",
  });

  revalidatePath("/organizacao");
  return { success: true };
}

export async function sendDigestNow(): Promise<DigestFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return { error: "Apenas administradores podem disparar notificações." };
  }

  const result = await sendCertificateDigestEmails(supabase);

  await logAudit(supabase, {
    userId: user.id,
    action: "send_digest_email",
    entityType: "notification",
    description: `disparou manualmente o envio de notificações por e-mail (${result.alertingCertificates} certificado(s), ${result.sent}/${result.recipients} e-mail(s) enviados)`,
  });

  if (result.alertingCertificates === 0) {
    return { success: "Nenhum certificado vencendo, vencido ou vence hoje no momento -- nenhum e-mail enviado." };
  }

  return {
    success: `${result.sent} e-mail(s) enviado(s) para ${result.recipients} usuário(s), referente a ${result.alertingCertificates} certificado(s)${result.failed > 0 ? ` (${result.failed} falharam${result.firstError ? `: ${result.firstError}` : ""})` : ""}.`,
  };
}
