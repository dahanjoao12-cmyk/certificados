import { createClient } from "@/lib/supabase/server";
import type { ImportRun } from "@/lib/types/database";

export const dynamic = "force-dynamic";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default async function ImportHistoryPage() {
  const supabase = await createClient();
  const { data: imports } = await supabase
    .from("imports")
    .select("*, imported_by_profile:profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (imports ?? []) as (ImportRun & { imported_by_profile: { full_name: string } | null })[];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Histórico de importações</h1>
        <p className="text-sm text-slate-500">Registro de todas as importações realizadas.</p>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="w-full min-w-max text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">Data</th>
              <th className="px-4 py-2.5">Arquivo</th>
              <th className="px-4 py-2.5">Usuário</th>
              <th className="px-4 py-2.5">Linhas</th>
              <th className="px-4 py-2.5">Empresas criadas</th>
              <th className="px-4 py-2.5">Empresas atualizadas</th>
              <th className="px-4 py-2.5">Certificados criados</th>
              <th className="px-4 py-2.5">Duplicidades</th>
              <th className="px-4 py-2.5">Conflitos</th>
              <th className="px-4 py-2.5">Erros</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((run) => (
              <tr key={run.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-2.5 text-slate-700">{formatDateTime(run.created_at)}</td>
                <td className="px-4 py-2.5 text-slate-700">{run.file_name}</td>
                <td className="px-4 py-2.5 text-slate-700">{run.imported_by_profile?.full_name ?? "-"}</td>
                <td className="px-4 py-2.5 text-slate-700">{run.total_rows}</td>
                <td className="px-4 py-2.5 text-slate-700">{run.companies_created}</td>
                <td className="px-4 py-2.5 text-slate-700">{run.companies_updated}</td>
                <td className="px-4 py-2.5 text-slate-700">{run.certificates_created}</td>
                <td className="px-4 py-2.5 text-slate-700">{run.duplicates}</td>
                <td className="px-4 py-2.5 text-slate-700">{run.conflicts}</td>
                <td className="px-4 py-2.5 text-slate-700">{run.errors}</td>
                <td className="px-4 py-2.5 text-slate-700">{run.status}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-12 text-center text-sm text-slate-500">
                  Nenhuma importação realizada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
