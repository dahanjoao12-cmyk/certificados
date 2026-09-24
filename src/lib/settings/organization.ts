import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrganizationInfo } from "@/lib/types/database";

const EMPTY_ORGANIZATION: OrganizationInfo = {
  cnpj: null,
  corporate_name: null,
  trade_name: null,
  zip_code: null,
  address_street: null,
  address_number: null,
  address_complement: null,
  neighborhood: null,
  city: null,
  uf: null,
};

export async function getOrganizationInfo(supabase: SupabaseClient): Promise<OrganizationInfo> {
  const { data } = await supabase.from("settings").select("value").eq("key", "organization_info").maybeSingle();

  if (!data) return EMPTY_ORGANIZATION;
  return { ...EMPTY_ORGANIZATION, ...(data.value as Partial<OrganizationInfo>) };
}
