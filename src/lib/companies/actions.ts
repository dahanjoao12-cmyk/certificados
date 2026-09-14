"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit/log";
import { detectDocumentType } from "@/lib/documents/document";
import { companySchema, normalizeCompanyInput } from "./schema";

export interface CompanyFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function parseForm(formData: FormData) {
  return companySchema.safeParse({
    code: formData.get("code"),
    document: formData.get("document"),
    corporate_name: formData.get("corporate_name"),
    trade_name: formData.get("trade_name"),
    short_name: formData.get("short_name"),
    municipality: formData.get("municipality"),
    uf: formData.get("uf"),
    situation: formData.get("situation"),
    responsible: formData.get("responsible"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    notes: formData.get("notes"),
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

  const { data, error } = await supabase
    .from("companies")
    .insert({
      ...normalized,
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
    description: `criou a empresa ${normalized.corporate_name} (código ${normalized.code})`,
  });

  revalidatePath("/empresas");
  redirect(`/empresas/${data.id}`);
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

  const { error } = await supabase
    .from("companies")
    .update({ ...normalized, document_type: documentType, updated_by: user.id })
    .eq("id", companyId);

  if (error) {
    return { error: friendlyDbError(error) };
  }

  await logAudit(supabase, {
    userId: user.id,
    action: "update",
    entityType: "company",
    entityId: companyId,
    description: `atualizou o cadastro da empresa ${normalized.corporate_name}`,
  });

  revalidatePath(`/empresas/${companyId}`);
  redirect(`/empresas/${companyId}`);
}

function flattenZodErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}
