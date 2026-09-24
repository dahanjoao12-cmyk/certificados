import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { parseCompanyFilters, listCompanies } from "@/lib/companies/queries";
import { getCertificateThresholds } from "@/lib/settings/thresholds";
import { formatDocument } from "@/lib/documents/document";
import { Input, Select } from "@/components/ui/input";
import { Pagination } from "@/components/dashboard/pagination";
import { NewCompanyModal } from "@/components/companies/new-company-modal";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = parseCompanyFilters(params);
  const supabase = await createClient();
  const [{ rows, total }, thresholds, { data: users }] = await Promise.all([
    listCompanies(supabase, filters),
    getCertificateThresholds(supabase),
    supabase.from("profiles").select("id, full_name").eq("active", true).order("full_name"),
  ]);

  const currentQuery = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) =>
      value === undefined ? [] : Array.isArray(value) ? value.map((v) => [key, v] as [string, string]) : [[key, value] as [string, string]]
    )
  ).toString();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Clientes</h1>
          <p className="text-sm text-slate-500">Cadastro dos clientes do escritório.</p>
        </div>
        <NewCompanyModal defaultWarningDays={thresholds.warning_days} users={users ?? []} />
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-white p-4" method="get">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-700">Nome, código ou CNPJ/CPF</label>
          <Input name="q" defaultValue={filters.q ?? ""} placeholder="Buscar..." />
        </div>
        <div className="w-40">
          <label className="mb-1 block text-xs font-medium text-slate-700">Município</label>
          <Input name="municipality" defaultValue={filters.municipality ?? ""} />
        </div>
        <div className="w-24">
          <label className="mb-1 block text-xs font-medium text-slate-700">UF</label>
          <Input name="uf" maxLength={2} defaultValue={filters.uf ?? ""} />
        </div>
        <div className="w-36">
          <label className="mb-1 block text-xs font-medium text-slate-700">Situação</label>
          <Select name="active" defaultValue={filters.active === undefined ? "" : String(filters.active)}>
            <option value="">Todas</option>
            <option value="true">Ativas</option>
            <option value="false">Inativas</option>
          </Select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Filtrar
        </button>
      </form>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="w-full min-w-max text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">Código</th>
              <th className="px-4 py-2.5">CNPJ/CPF</th>
              <th className="px-4 py-2.5">Razão social</th>
              <th className="px-4 py-2.5">Município</th>
              <th className="px-4 py-2.5">UF</th>
              <th className="px-4 py-2.5">Situação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((company) => (
              <tr key={company.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-900">
                  <Link href={`/clientes/${company.id}`} className="hover:underline">
                    {company.code}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-slate-700">{formatDocument(company.document)}</td>
                <td className="px-4 py-2.5 text-slate-700">
                  <Link href={`/clientes/${company.id}`} className="hover:underline">
                    {company.corporate_name}
                  </Link>
                  {company.short_name && <span className="ml-1 text-xs text-slate-500">({company.short_name})</span>}
                </td>
                <td className="px-4 py-2.5 text-slate-700">{company.municipality ?? "-"}</td>
                <td className="px-4 py-2.5 text-slate-700">{company.uf ?? "-"}</td>
                <td className="px-4 py-2.5 text-slate-700">
                  {company.active ? (
                    <span className="text-emerald-700">Ativa</span>
                  ) : (
                    <span className="text-slate-400">Inativa</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={filters.page} pageSize={filters.pageSize} total={total} currentQuery={currentQuery} />
    </div>
  );
}
