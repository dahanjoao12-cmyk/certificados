import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { getCertificateThresholds } from "@/lib/settings/thresholds";
import { ThresholdsForm } from "@/components/settings/thresholds-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const thresholds = await getCertificateThresholds(supabase);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500">Regras usadas em todo o sistema para calcular o status dos certificados.</p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-6">
        <ThresholdsForm thresholds={thresholds} readOnly={user.profile.role !== "admin"} />
      </div>
    </div>
  );
}
