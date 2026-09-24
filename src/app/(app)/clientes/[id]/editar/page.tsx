import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanyForm } from "@/components/companies/company-form";
import { updateCompany } from "@/lib/companies/actions";
import type { Company } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: company }, { data: users }] = await Promise.all([
    supabase.from("companies").select("*").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("id, full_name").eq("active", true).order("full_name"),
  ]);

  if (!company) notFound();

  const boundAction = updateCompany.bind(null, id);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Editar cliente</h1>
        <p className="text-sm text-slate-500">{(company as Company).corporate_name}</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-6">
        <CompanyForm action={boundAction} company={company as Company} users={users ?? []} />
      </div>
    </div>
  );
}
