"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ReportBase } from "./engine";

export async function saveReportPreset(params: {
  name: string;
  base: ReportBase;
  filters: Record<string, string>;
  columns: string[];
  sort?: string;
  dir?: "asc" | "desc";
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!params.name.trim()) {
    return { error: "Informe um nome para o relatório." };
  }

  const { error } = await supabase.from("report_presets").insert({
    name: params.name.trim(),
    base: params.base,
    filters: params.filters,
    columns: params.columns,
    order_by: params.sort ? { field: params.sort, direction: params.dir ?? "asc" } : {},
    created_by: user.id,
  });

  if (error) {
    return { error: "Não foi possível salvar o relatório." };
  }

  revalidatePath("/relatorios");
  return {};
}

export async function deleteReportPreset(id: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.from("report_presets").delete().eq("id", id);
  revalidatePath("/relatorios");
}
