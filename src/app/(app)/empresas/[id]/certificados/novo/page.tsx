import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CertificateForm } from "@/components/certificates/certificate-form";
import { createCertificate } from "@/lib/certificates/actions";
import { getCertificateThresholds } from "@/lib/settings/thresholds";

export const dynamic = "force-dynamic";

export default async function NewCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("id, corporate_name")
    .eq("id", id)
    .maybeSingle();

  if (!company) notFound();

  const [{ data: currentCertificate }, thresholds] = await Promise.all([
    supabase.from("certificates").select("id").eq("company_id", id).eq("is_current", true).maybeSingle(),
    getCertificateThresholds(supabase),
  ]);

  const boundAction = createCertificate.bind(null, id);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {currentCertificate ? "Renovar certificado" : "Novo certificado"}
        </h1>
        <p className="text-sm text-slate-500">{company.corporate_name}</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-6">
        <CertificateForm
          action={boundAction}
          companyId={id}
          isRenewal={Boolean(currentCertificate)}
          defaultWarningDays={thresholds.warning_days}
        />
      </div>
    </div>
  );
}
