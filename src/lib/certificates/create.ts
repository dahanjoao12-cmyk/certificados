import type { SupabaseClient } from "@supabase/supabase-js";
import { logAudit } from "@/lib/audit/log";
import type { CertificateOrigin, CertificateType, CertificateModel } from "@/lib/types/database";

export interface NewCertificateFields {
  type: CertificateType;
  model: CertificateModel;
  valid_from?: string | null;
  valid_to: string;
  warning_days?: number | null;
  notes?: string | null;
}

/**
 * Shared core of "add a certificate to a company", used by the manual form
 * and by the spreadsheet importer. If the company already has a current
 * certificate, this is treated as a renewal: the DB trigger demotes the
 * previous one (kept, never deleted) and we log the transition.
 */
export async function insertCertificateForCompany(
  supabase: SupabaseClient,
  params: {
    companyId: string;
    userId: string;
    fields: NewCertificateFields;
    origin: CertificateOrigin;
  }
): Promise<{ certificateId: string; isRenewal: boolean }> {
  const { data: previousCurrent } = await supabase
    .from("certificates")
    .select("id, valid_to")
    .eq("company_id", params.companyId)
    .eq("is_current", true)
    .maybeSingle();

  const { data: created, error } = await supabase
    .from("certificates")
    .insert({
      ...params.fields,
      company_id: params.companyId,
      is_current: true,
      origin: params.origin,
      created_by: params.userId,
    })
    .select("id")
    .single();

  if (error) throw error;

  const isRenewal = Boolean(previousCurrent);

  await supabase.from("certificate_history").insert({
    certificate_id: created.id,
    company_id: params.companyId,
    action: isRenewal ? "renewed" : "created",
    field_changed: isRenewal ? "valid_to" : null,
    old_value: previousCurrent?.valid_to ?? null,
    new_value: params.fields.valid_to,
    changed_by: params.userId,
  });

  await logAudit(supabase, {
    userId: params.userId,
    action: isRenewal ? "renew_certificate" : "create_certificate",
    entityType: "certificate",
    entityId: created.id,
    description: isRenewal
      ? `renovou o certificado da empresa (novo vencimento ${params.fields.valid_to})`
      : `cadastrou um novo certificado (vencimento ${params.fields.valid_to})`,
  });

  return { certificateId: created.id, isRenewal };
}
