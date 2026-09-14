"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit/log";
import { certificateSchema, normalizeCertificateInput } from "./schema";

export interface CertificateFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function parseForm(formData: FormData) {
  return certificateSchema.safeParse({
    type: formData.get("type"),
    model: formData.get("model"),
    serial_number: formData.get("serial_number"),
    subject: formData.get("subject"),
    issuer: formData.get("issuer"),
    certificate_authority: formData.get("certificate_authority"),
    valid_from: formData.get("valid_from"),
    valid_to: formData.get("valid_to"),
    fingerprint: formData.get("fingerprint"),
    algorithm: formData.get("algorithm"),
    notes: formData.get("notes"),
  });
}

function flattenZodErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/**
 * Creates a certificate for a company. If the company already has a
 * "current" certificate, this is a RENEWAL: the DB trigger demotes the old
 * one to is_current=false (it is never deleted or overwritten), and we log
 * the renewal in certificate_history so the change is traceable.
 */
export async function createCertificate(
  companyId: string,
  _prevState: CertificateFormState,
  formData: FormData
): Promise<CertificateFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: previousCurrent } = await supabase
    .from("certificates")
    .select("id, valid_to")
    .eq("company_id", companyId)
    .eq("is_current", true)
    .maybeSingle();

  const normalized = normalizeCertificateInput(parsed.data);

  const { data: created, error } = await supabase
    .from("certificates")
    .insert({
      ...normalized,
      company_id: companyId,
      is_current: true,
      origin: "manual",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: "Não foi possível salvar o certificado. Tente novamente." };
  }

  const isRenewal = Boolean(previousCurrent);

  await supabase.from("certificate_history").insert({
    certificate_id: created.id,
    company_id: companyId,
    action: isRenewal ? "renewed" : "created",
    field_changed: isRenewal ? "valid_to" : null,
    old_value: previousCurrent?.valid_to ?? null,
    new_value: normalized.valid_to,
    changed_by: user.id,
  });

  await logAudit(supabase, {
    userId: user.id,
    action: isRenewal ? "renew_certificate" : "create_certificate",
    entityType: "certificate",
    entityId: created.id,
    description: isRenewal
      ? `renovou o certificado da empresa (novo vencimento ${normalized.valid_to})`
      : `cadastrou um novo certificado (vencimento ${normalized.valid_to})`,
  });

  revalidatePath(`/empresas/${companyId}`);
  redirect(`/empresas/${companyId}`);
}

export async function updateCertificate(
  certificateId: string,
  companyId: string,
  _prevState: CertificateFormState,
  formData: FormData
): Promise<CertificateFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: before } = await supabase
    .from("certificates")
    .select("valid_to")
    .eq("id", certificateId)
    .maybeSingle();

  const normalized = normalizeCertificateInput(parsed.data);

  const { error } = await supabase.from("certificates").update(normalized).eq("id", certificateId);
  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  if (before && before.valid_to !== normalized.valid_to) {
    await supabase.from("certificate_history").insert({
      certificate_id: certificateId,
      company_id: companyId,
      action: "updated",
      field_changed: "valid_to",
      old_value: before.valid_to,
      new_value: normalized.valid_to,
      changed_by: user.id,
    });
  }

  await logAudit(supabase, {
    userId: user.id,
    action: "update_certificate",
    entityType: "certificate",
    entityId: certificateId,
    description: "atualizou os dados de um certificado",
  });

  revalidatePath(`/empresas/${companyId}`);
  redirect(`/empresas/${companyId}`);
}

export async function archiveCertificate(certificateId: string, companyId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("certificates").update({ archived: true }).eq("id", certificateId);

  await supabase.from("certificate_history").insert({
    certificate_id: certificateId,
    company_id: companyId,
    action: "archived",
    changed_by: user.id,
  });

  await logAudit(supabase, {
    userId: user.id,
    action: "archive_certificate",
    entityType: "certificate",
    entityId: certificateId,
    description: "arquivou um certificado",
  });

  revalidatePath(`/empresas/${companyId}`);
}

export async function restoreCertificate(certificateId: string, companyId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("certificates").update({ archived: false }).eq("id", certificateId);

  await supabase.from("certificate_history").insert({
    certificate_id: certificateId,
    company_id: companyId,
    action: "restored",
    changed_by: user.id,
  });

  await logAudit(supabase, {
    userId: user.id,
    action: "restore_certificate",
    entityType: "certificate",
    entityId: certificateId,
    description: "restaurou um certificado arquivado",
  });

  revalidatePath(`/empresas/${companyId}`);
}

export async function deleteCertificate(certificateId: string, companyId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    throw new Error("Apenas administradores podem excluir certificados.");
  }

  await supabase.from("certificates").delete().eq("id", certificateId);

  await logAudit(supabase, {
    userId: user.id,
    action: "delete_certificate",
    entityType: "certificate",
    entityId: certificateId,
    description: "excluiu um certificado",
  });

  revalidatePath(`/empresas/${companyId}`);
}
