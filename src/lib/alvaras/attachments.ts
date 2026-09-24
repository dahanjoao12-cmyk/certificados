"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit/log";

const BUCKET = "alvara-anexos";
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

export interface AttachmentFormState {
  error?: string;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-140);
}

export async function uploadAlvaraAttachment(
  alvaraId: string,
  companyId: string,
  _prevState: AttachmentFormState,
  formData: FormData
): Promise<AttachmentFormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "Arquivo muito grande (máximo 10MB)." };
  }
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { error: "Formato não suportado. Use PDF, JPG, PNG ou WEBP." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: current } = await supabase.from("alvaras").select("attachment_path").eq("id", alvaraId).maybeSingle();

  const path = `${alvaraId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
  });
  if (uploadError) {
    return { error: "Não foi possível enviar o arquivo. Tente novamente." };
  }

  if (current?.attachment_path) {
    await supabase.storage.from(BUCKET).remove([current.attachment_path]);
  }

  await supabase
    .from("alvaras")
    .update({
      attachment_path: path,
      attachment_name: file.name,
      attachment_size: file.size,
      attachment_uploaded_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq("id", alvaraId);

  await supabase.from("alvara_history").insert({
    alvara_id: alvaraId,
    company_id: companyId,
    action: "updated",
    field_changed: "attachment",
    old_value: null,
    new_value: file.name,
    changed_by: user.id,
  });

  await logAudit(supabase, {
    userId: user.id,
    action: "upload_alvara_attachment",
    entityType: "alvara",
    entityId: alvaraId,
    description: `anexou o arquivo "${file.name}" a um alvará`,
  });

  revalidatePath(`/clientes/${companyId}`);
  revalidatePath(`/clientes/${companyId}/alvaras/${alvaraId}/editar`);
  return {};
}

export async function removeAlvaraAttachment(alvaraId: string, companyId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: current } = await supabase.from("alvaras").select("attachment_path").eq("id", alvaraId).maybeSingle();
  if (!current?.attachment_path) return;

  await supabase.storage.from(BUCKET).remove([current.attachment_path]);

  await supabase
    .from("alvaras")
    .update({
      attachment_path: null,
      attachment_name: null,
      attachment_size: null,
      attachment_uploaded_at: null,
      updated_by: user.id,
    })
    .eq("id", alvaraId);

  await supabase.from("alvara_history").insert({
    alvara_id: alvaraId,
    company_id: companyId,
    action: "updated",
    field_changed: "attachment",
    old_value: current.attachment_path,
    new_value: null,
    changed_by: user.id,
  });

  await logAudit(supabase, {
    userId: user.id,
    action: "remove_alvara_attachment",
    entityType: "alvara",
    entityId: alvaraId,
    description: "removeu o anexo de um alvará",
  });

  revalidatePath(`/clientes/${companyId}`);
  revalidatePath(`/clientes/${companyId}/alvaras/${alvaraId}/editar`);
}
