"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit/log";
import { detectDocumentType } from "@/lib/documents/document";
import { insertCertificateForCompany } from "@/lib/certificates/create";
import { companySchema, normalizeCompanyInput } from "./schema";
import type { CertificateType, CertificateModel } from "@/lib/types/database";

export interface CompanyFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * A field the current form variant simply doesn't render (e.g. the
 * quick-create modal has no "phone" input) makes formData.get() return
 * `null`, not `undefined` -- and zod's `.optional()` only treats `undefined`
 * as absent, rejecting `null` with a useless "Invalid input". Coerce every
 * missing field to "" so both form variants (full CompanyForm and the
 * quick-create CompanyWithCertificateForm) validate the same way regardless
 * of which optional inputs they happen to render.
 */
function field(formData: FormData, name: string): string {
  return (formData.get(name) as string | null) ?? "";
}

function parseForm(formData: FormData) {
  return companySchema.safeParse({
    code: field(formData, "code"),
    document: field(formData, "document"),
    corporate_name: field(formData, "corporate_name"),
    trade_name: field(formData, "trade_name"),
    short_name: field(formData, "short_name"),
    municipality: field(formData, "municipality"),
    uf: field(formData, "uf"),
    responsible_user_id: field(formData, "responsible_user_id"),
    phone: field(formData, "phone"),
    whatsapp: field(formData, "whatsapp"),
    email: field(formData, "email"),
    state_registration: field(formData, "state_registration"),
    municipal_tax_registration: field(formData, "municipal_tax_registration"),
    zip_code: field(formData, "zip_code"),
    address_street: field(formData, "address_street"),
    address_number: field(formData, "address_number"),
    address_complement: field(formData, "address_complement"),
    neighborhood: field(formData, "neighborhood"),
    notes: field(formData, "notes"),
    active: formData.get("active") === "on",
  });
}

function friendlyDbError(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    if (error.message.includes("companies_code_unique")) {
      return "Já existe uma empresa cadastrada com este código.";
    }
    if (error.message.includes("companies_document_unique")) {
      return "Já existe uma empresa cadastrada com este CNPJ/CPF.";
    }
    return "Já existe um registro com estes dados.";
  }
  return "Não foi possível salvar. Tente novamente.";
}

export async function createCompany(
  _prevState: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const normalized = normalizeCompanyInput(parsed.data);
  const documentType = detectDocumentType(normalized.document);
  // "Situação" is not a free-text field in the form -- it just mirrors the
  // "Cliente ativo" checkbox, so nobody has to type "ativa" on every cliente.
  const situation = normalized.active ? "ativa" : "inativa";

  const { data, error } = await supabase
    .from("companies")
    .insert({
      ...normalized,
      situation,
      document_type: documentType,
      origin: "manual",
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: friendlyDbError(error) };
  }

  await logAudit(supabase, {
    userId: user.id,
    action: "create",
    entityType: "company",
    entityId: data.id,
    description: `criou o cliente ${normalized.corporate_name} (código ${normalized.code})`,
  });

  revalidatePath("/clientes");
  redirect(`/clientes/${data.id}`);
}

export async function updateCompany(
  companyId: string,
  _prevState: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const normalized = normalizeCompanyInput(parsed.data);
  const documentType = detectDocumentType(normalized.document);
  const situation = normalized.active ? "ativa" : "inativa";

  const { error } = await supabase
    .from("companies")
    .update({ ...normalized, situation, document_type: documentType, updated_by: user.id })
    .eq("id", companyId);

  if (error) {
    return { error: friendlyDbError(error) };
  }

  await logAudit(supabase, {
    userId: user.id,
    action: "update",
    entityType: "company",
    entityId: companyId,
    description: `atualizou o cadastro do cliente ${normalized.corporate_name}`,
  });

  revalidatePath(`/clientes/${companyId}`);
  redirect(`/clientes/${companyId}`);
}

/** "1"|"2"|"3"|"5" years from today, or a specific custom date -- see the quick-create form. */
function resolveValidTo(duration: string, customDate: string): string | null {
  if (duration === "custom") {
    return customDate || null;
  }
  const years = Number(duration);
  if (!Number.isInteger(years) || years <= 0) return null;
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().slice(0, 10);
}

/**
 * Quick-create used by the "Novo cliente" modal: registers the cliente and
 * its first certificate in one step, since in practice every new cliente
 * being added already has a certificate to record.
 */
export async function createCompanyWithCertificate(
  _prevState: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const certType = formData.get("cert_type") === "e-cpf" ? "e-cpf" : "e-cnpj";
  const certModel = formData.get("cert_model") === "A3" ? "A3" : "A1";
  const duration = String(formData.get("duration") ?? "1");
  const customDate = String(formData.get("valid_to_custom") ?? "");
  const validTo = resolveValidTo(duration, customDate);
  if (!validTo) {
    return { fieldErrors: { valid_to_custom: "Informe uma data de vencimento válida." } };
  }
  const warningDaysRaw = String(formData.get("warning_days") ?? "").trim();
  if (warningDaysRaw && (!Number.isInteger(Number(warningDaysRaw)) || Number(warningDaysRaw) <= 0)) {
    return { fieldErrors: { warning_days: "Informe um número de dias válido." } };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const normalized = normalizeCompanyInput(parsed.data);
  const documentType = detectDocumentType(normalized.document);
  const situation = normalized.active ? "ativa" : "inativa";

  const { data: company, error } = await supabase
    .from("companies")
    .insert({
      ...normalized,
      situation,
      document_type: documentType,
      origin: "manual",
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { error: friendlyDbError(error) };
  }

  await logAudit(supabase, {
    userId: user.id,
    action: "create",
    entityType: "company",
    entityId: company.id,
    description: `criou o cliente ${normalized.corporate_name} (código ${normalized.code})`,
  });

  try {
    await insertCertificateForCompany(supabase, {
      companyId: company.id,
      userId: user.id,
      fields: {
        type: certType as CertificateType,
        model: certModel as CertificateModel,
        valid_to: validTo,
        warning_days: warningDaysRaw ? Number(warningDaysRaw) : null,
      },
      origin: "manual",
    });
  } catch {
    revalidatePath("/clientes");
    redirect(`/clientes/${company.id}?erro=certificado`);
  }

  revalidatePath("/clientes");
  revalidatePath("/");
  revalidatePath("/certificados");
  redirect(`/clientes/${company.id}`);
}

function flattenZodErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}
