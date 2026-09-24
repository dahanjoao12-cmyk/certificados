import { createClient } from "@/lib/supabase/server";
import { getCertificateThresholds } from "@/lib/settings/thresholds";
import { CompanyWithCertificateForm } from "@/components/companies/company-with-certificate-form";

export const dynamic = "force-dynamic";

export default async function NewCompanyPage() {
  const supabase = await createClient();
  const [thresholds, { data: users }] = await Promise.all([
    getCertificateThresholds(supabase),
    supabase.from("profiles").select("id, full_name").eq("active", true).order("full_name"),
  ]);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Novo cliente</h1>
        <p className="text-sm text-slate-500">Cadastre o cliente e o certificado atual dele.</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-6">
        <CompanyWithCertificateForm defaultWarningDays={thresholds.warning_days} users={users ?? []} />
      </div>
    </div>
  );
}
