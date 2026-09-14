import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CertificateForm } from "@/components/certificates/certificate-form";
import { updateCertificate } from "@/lib/certificates/actions";
import type { Certificate } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function EditCertificatePage({
  params,
}: {
  params: Promise<{ id: string; certificateId: string }>;
}) {
  const { id, certificateId } = await params;
  const supabase = await createClient();

  const [{ data: company }, { data: certificate }] = await Promise.all([
    supabase.from("companies").select("id, corporate_name").eq("id", id).maybeSingle(),
    supabase.from("certificates").select("*").eq("id", certificateId).maybeSingle(),
  ]);

  if (!company || !certificate) notFound();

  const boundAction = updateCertificate.bind(null, certificateId, id);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Editar certificado</h1>
        <p className="text-sm text-slate-500">{company.corporate_name}</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-6">
        <CertificateForm action={boundAction} certificate={certificate as Certificate} companyId={id} />
      </div>
    </div>
  );
}
