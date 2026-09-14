import { CompanyForm } from "@/components/companies/company-form";
import { createCompany } from "@/lib/companies/actions";

export default function NewCompanyPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Nova empresa</h1>
        <p className="text-sm text-slate-500">Cadastre uma nova empresa do escritório.</p>
      </div>
      <div className="rounded-md border border-slate-200 bg-white p-6">
        <CompanyForm action={createCompany} />
      </div>
    </div>
  );
}
