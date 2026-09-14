import type { SupabaseClient } from "@supabase/supabase-js";
import type { CertificateThresholdSettings } from "@/lib/types/database";

const DEFAULT_THRESHOLDS: CertificateThresholdSettings = {
  warning_days: 30,
  alert_days: [60, 30, 15, 7, 1],
};

export async function getCertificateThresholds(
  supabase: SupabaseClient
): Promise<CertificateThresholdSettings> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "certificate_thresholds")
    .maybeSingle();

  if (!data) return DEFAULT_THRESHOLDS;
  return data.value as CertificateThresholdSettings;
}
