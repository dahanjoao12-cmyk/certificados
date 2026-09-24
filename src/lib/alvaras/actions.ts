"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit/log";
import { alvaraSchema, normalizeAlvaraInput } from "./schema";

export interface AlvaraFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
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
    condicionantes_total: field(formData, "condicionantes_total"),
    condicionantes_atendidas: field(formData, "condicionantes_atendidas"),
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
