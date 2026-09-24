"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit/log";
import { companySchema, normalizeCompanyInput } from "@/lib/companies/schema";
import { detectDocumentType } from "@/lib/documents/document";
import { alvaraSchema, normalizeAlvaraInput } from "./schema";
import { uploadAlvaraAttachment } from "./attachments";

export interface AlvaraFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface StandaloneAlvaraFormState extends AlvaraFormState {
  success?: boolean;
  companyId?: string;
}

function field(formData: FormData, name: string): string {
  return (formData.get(name) as string | null) ?? "";
}

function parseForm(formData: FormData) {
  return alvaraSchema.safeParse({
    type_id: field(formData, "type_id"),
    status_mode: field(formData, "status_mode"),
    manual_status: field(formData, "manual_status"),
    valid_to: field(formData, "valid_to"),
    prioritario: formData.get("prioritario") === "on",
    municipality: field(formData, "municipality"),
    uf: field(formData, "uf"),
    notes: field(formData, "notes"),
    metragem_m2: field(formData, "metragem_m2"),
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

export async function createAlvara(
  companyId: string,
  _prevState: AlvaraFormState,
  formData: FormData
): Promise<AlvaraFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { fieldErrors: flattenZodErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const normalized = normalizeAlvaraInput(parsed.data);

  const { data: alvara, error } = await supabase
    .from("alvaras")
    .insert({ ...normalized, company_id: companyId, origin: "manual", created_by: user.id, updated_by: user.id })
    .select("id")
    .single();

  if (error) {
    return { error: "Não foi possível salvar o alvará. Tente novamente." };
  }

  await supabase.from("alvara_history").insert({
    alvara_id: alvara.id,
    company_id: companyId,
    action: "created",
    changed_by: user.id,
  });

  await logAudit(supabase, {
    userId: user.id,
    action: "create_alvara",
    entityType: "alvara",
    entityId: alvara.id,
    description: "cadastrou um alvará",
  });

  revalidatePath(`/clientes/${companyId}`);
  revalidatePath("/alvaras");
  revalidatePath("/");
  redirect(`/clientes/${companyId}`);
}

export async function updateAlvara(
  alvaraId: string,
  companyId: string,
  _prevState: AlvaraFormState,
  formData: FormData
): Promise<AlvaraFormState> {
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
    .from("alvaras")
    .select("valid_to, issued")
    .eq("id", alvaraId)
    .maybeSingle();

  const normalized = normalizeAlvaraInput(parsed.data);

  const { error } = await supabase.from("alvaras").update({ ...normalized, updated_by: user.id }).eq("id", alvaraId);
  if (error) {
    return { error: "Não foi possível salvar as alterações." };
  }

  const justIssued = before && !before.issued && normalized.issued;
  await supabase.from("alvara_history").insert({
    alvara_id: alvaraId,
    company_id: companyId,
    action: justIssued ? "issued" : "updated",
    field_changed: before && before.valid_to !== normalized.valid_to ? "valid_to" : null,
    old_value: before?.valid_to ?? null,
    new_value: normalized.valid_to,
    changed_by: user.id,
  });

  await logAudit(supabase, {
    userId: user.id,
    action: "update_alvara",
    entityType: "alvara",
    entityId: alvaraId,
    description: "atualizou os dados de um alvará",
  });

  revalidatePath(`/clientes/${companyId}`);
  revalidatePath("/alvaras");
  revalidatePath("/");
  redirect(`/clientes/${companyId}`);
}

export async function archiveAlvara(alvaraId: string, companyId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("alvaras").update({ archived: true, updated_by: user.id }).eq("id", alvaraId);

  await supabase.from("alvara_history").insert({
    alvara_id: alvaraId,
    company_id: companyId,
    action: "archived",
    changed_by: user.id,
  });

  await logAudit(supabase, {
    userId: user.id,
    action: "archive_alvara",
    entityType: "alvara",
    entityId: alvaraId,
    description: "arquivou um alvará",
  });

  revalidatePath(`/clientes/${companyId}`);
  revalidatePath("/alvaras");
  revalidatePath("/");
}

export async function restoreAlvara(alvaraId: string, companyId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("alvaras").update({ archived: false, updated_by: user.id }).eq("id", alvaraId);

  await supabase.from("alvara_history").insert({
    alvara_id: alvaraId,
    company_id: companyId,
    action: "restored",
    changed_by: user.id,
  });

  await logAudit(supabase, {
    userId: user.id,
    action: "restore_alvara",
    entityType: "alvara",
    entityId: alvaraId,
    description: "restaurou um alvará arquivado",
  });

  revalidatePath(`/clientes/${companyId}`);
  revalidatePath("/alvaras");
  revalidatePath("/");
}

/**
 * Cria um alvará direto da tela `/alvaras` (botão "Novo alvará" ou o
 * arrastar-e-soltar de arquivo), sem navegar para a página do cliente
 * primeiro. Aceita um cliente já cadastrado (`company_mode=existing` +
 * `company_id`) ou os dados mínimos de um cliente novo
 * (`company_mode=new` + `new_code`/`new_document`/`new_corporate_name`),
 * reaproveitando a mesma validação de `companySchema`. Se vier um arquivo,
 * já anexa ao alvará recém-criado.
 */
export async function createAlvaraStandalone(
  _prevState: StandaloneAlvaraFormState,
  formData: FormData
): Promise<StandaloneAlvaraFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const companyMode = field(formData, "company_mode");
  let companyId: string;

  if (companyMode === "new") {
    const parsedCompany = companySchema.safeParse({
      code: field(formData, "new_code"),
      document: field(formData, "new_document"),
      corporate_name: field(formData, "new_corporate_name"),
      trade_name: "",
      short_name: "",
      municipality: field(formData, "municipality"),
      uf: field(formData, "uf"),
      situation: "",
      responsible_user_id: "",
      phone: "",
      whatsapp: "",
      email: "",
      state_registration: "",
      municipal_tax_registration: "",
      zip_code: "",
      address_street: "",
      address_number: "",
      address_complement: "",
      neighborhood: "",
      notes: "",
      active: true,
    });
    if (!parsedCompany.success) {
      const fieldErrors = flattenZodErrors(parsedCompany.error);
      // Re-key company field errors so they land on the right input in the modal.
      const remapped: Record<string, string> = {};
      for (const [key, value] of Object.entries(fieldErrors)) {
        remapped[key === "code" ? "new_code" : key === "document" ? "new_document" : key === "corporate_name" ? "new_corporate_name" : key] = value;
      }
      return { fieldErrors: remapped };
    }

    const normalizedCompany = normalizeCompanyInput(parsedCompany.data);
    const documentType = detectDocumentType(normalizedCompany.document);
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        ...normalizedCompany,
        situation: "ativa",
        document_type: documentType,
        origin: "manual",
        created_by: user.id,
        updated_by: user.id,
      })
      .select("id")
      .single();

    if (companyError) {
      if (companyError.code === "23505") {
        if (companyError.message.includes("companies_code_unique")) {
          return { fieldErrors: { new_code: "Já existe um cliente com este código." } };
        }
        if (companyError.message.includes("companies_document_unique")) {
          return { fieldErrors: { new_document: "Já existe um cliente com este CNPJ/CPF." } };
        }
      }
      return { error: "Não foi possível criar o cliente." };
    }

    companyId = company.id;
    await logAudit(supabase, {
      userId: user.id,
      action: "create",
      entityType: "company",
      entityId: companyId,
      description: `criou o cliente ${normalizedCompany.corporate_name} (código ${normalizedCompany.code}) a partir do cadastro de alvará`,
    });
  } else {
    companyId = field(formData, "company_id");
    if (!companyId) {
      return { fieldErrors: { company_id: "Selecione um cliente." } };
    }
  }

  const parsedAlvara = parseForm(formData);
  if (!parsedAlvara.success) {
    return { fieldErrors: flattenZodErrors(parsedAlvara.error) };
  }
  const normalizedAlvara = normalizeAlvaraInput(parsedAlvara.data);

  const { data: alvara, error: alvaraError } = await supabase
    .from("alvaras")
    .insert({ ...normalizedAlvara, company_id: companyId, origin: "manual", created_by: user.id, updated_by: user.id })
    .select("id")
    .single();

  if (alvaraError) {
    return { error: "Cliente salvo, mas não foi possível salvar o alvará. Tente novamente pela página do cliente." };
  }

  await supabase.from("alvara_history").insert({
    alvara_id: alvara.id,
    company_id: companyId,
    action: "created",
    changed_by: user.id,
  });

  await logAudit(supabase, {
    userId: user.id,
    action: "create_alvara",
    entityType: "alvara",
    entityId: alvara.id,
    description: "cadastrou um alvará",
  });

  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    await uploadAlvaraAttachment(alvara.id, companyId, {}, formData);
  }

  revalidatePath("/alvaras");
  revalidatePath(`/clientes/${companyId}`);
  revalidatePath("/");
  return { success: true, companyId };
}

export async function deleteAlvara(alvaraId: string, companyId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    throw new Error("Apenas administradores podem excluir alvarás.");
  }

  await supabase.from("alvaras").delete().eq("id", alvaraId);

  await logAudit(supabase, {
    userId: user.id,
    action: "delete_alvara",
    entityType: "alvara",
    entityId: alvaraId,
    description: "excluiu um alvará",
  });

  revalidatePath(`/clientes/${companyId}`);
  revalidatePath("/alvaras");
  revalidatePath("/");
}
