import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDocument } from "@/lib/documents/document";
import { StatusBadge } from "@/components/certificates/status-badge";
import { CertificateActions } from "@/components/certificates/certificate-actions";
import { ButtonLink } from "@/components/ui/button";
import type { Company, CertificateWithCompany, CertificateHistoryEntry } from "@/lib/types/database";

export const dynamic = "force-dynamic";

function formatDate(value: string | null): string {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const HISTORY_ACTION_LABELS: Record<string, string> = {
  created: "Certificado cadastrado",
  renewed: "Certificado renovado",
  updated: "Certificado atualizado",
  archived: "Certificado arquivado",
  restored: "Certificado restaurado",
  deleted: "Certificado excluído",
};

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("*, responsible_profile:profiles!companies_responsible_user_id_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!company) notFound();

  const [{ data: certificates }, { data: history }] = await Promise.all([
    supabase
      .from("certificates_view")
      .select("*")
      .eq("company_id", id)
      .order("valid_to", { ascending: false }),
    supabase
      .from("certificate_history")
      .select("*, changed_by_profile:profiles(full_name)")
      .eq("company_id", id)
      .order("changed_at", { ascending: false })
      .limit(50),
  ]);

  const rows = (certificates ?? []) as CertificateWithCompany[];
  const current = rows.find((c) => c.is_current && !c.archived) ?? rows.find((c) => c.is_current);
  const typedCompany = company as Company & { responsible_profile: { full_name: string } | null };
  const responsibleLabel = typedCompany.responsible_profile?.full_name ?? typedCompany.responsible ?? "-";

  return (
    <div className="space-y-6">
      {erro === "certificado" && (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-inset ring-amber-200">
          O cliente foi criado, mas não foi possível salvar o certificado. Cadastre-o abaixo.
        </div>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{typedCompany.corporate_name}</h1>
          {typedCompany.short_name && <p className="text-sm text-slate-500">{typedCompany.short_name}</p>}
        </div>
        <ButtonLink href={`/clientes/${id}/editar`} variant="secondary" size="sm">
          <Pencil size={13} /> Editar cliente
        </ButtonLink>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-md border border-slate-200 bg-white p-5 sm:grid-cols-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Código</p>
          <p className="mt-0.5 text-sm font-medium text-slate-900">{typedCompany.code}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">CNPJ/CPF</p>
          <p className="mt-0.5 text-sm font-medium text-slate-900">{formatDocument(typedCompany.document)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Município/UF</p>
          <p className="mt-0.5 text-sm font-medium text-slate-900">
            {typedCompany.municipality ?? "-"}
            {typedCompany.uf ? ` - ${typedCompany.uf}` : ""}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Responsável</p>
          <p className="mt-0.5 text-sm font-medium text-slate-900">{responsibleLabel}</p>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Certificado atual</h2>
          <ButtonLink href={`/clientes/${id}/certificados/novo`} size="sm">
            <Plus size={13} /> {current ? "Renovar certificado" : "Novo certificado"}
          </ButtonLink>
        </div>

        {current ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Tipo</p>
              <p className="mt-0.5 text-sm text-slate-900">
                {current.type === "e-cnpj" ? "e-CNPJ" : "e-CPF"} · {current.model}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Válido até</p>
              <p className="mt-0.5 text-sm text-slate-900">{formatDate(current.valid_to)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Dias restantes</p>
              <p className="mt-0.5 text-sm text-slate-900">{current.archived ? "-" : current.days_remaining}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</p>
              <div className="mt-0.5">
                <StatusBadge status={current.status} />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Nenhum certificado cadastrado para este cliente.</p>
        )}
      </div>

      <div className="rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Histórico de certificados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2">Tipo</th>
                <th className="px-5 py-2">Início</th>
                <th className="px-5 py-2">Vencimento</th>
                <th className="px-5 py-2">Status</th>
                <th className="px-5 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((cert) => (
                <tr key={cert.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-5 py-2.5 text-slate-700">
                    {cert.type === "e-cnpj" ? "e-CNPJ" : "e-CPF"} · {cert.model}
                  </td>
                  <td className="px-5 py-2.5 text-slate-700">{formatDate(cert.valid_from)}</td>
                  <td className="px-5 py-2.5 text-slate-700">{formatDate(cert.valid_to)}</td>
                  <td className="px-5 py-2.5">
                    <StatusBadge status={cert.status} />
                  </td>
                  <td className="px-5 py-2.5">
                    <CertificateActions certificateId={cert.id} companyId={id} archived={cert.archived} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500">
                    Nenhum certificado no histórico.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Histórico de alterações</h2>
        </div>
        <ul className="divide-y divide-slate-50">
          {((history ?? []) as (CertificateHistoryEntry & { changed_by_profile: { full_name: string } | null })[]).map(
            (entry) => (
              <li key={entry.id} className="px-5 py-3 text-sm">
                <p className="text-slate-900">
                  {HISTORY_ACTION_LABELS[entry.action] ?? entry.action}
                  {entry.field_changed === "valid_to" && entry.old_value && entry.new_value && (
                    <span className="text-slate-500">
                      {" "}
                      — vencimento de {formatDate(entry.old_value)} para {formatDate(entry.new_value)}
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {formatDateTime(entry.changed_at)} · {entry.changed_by_profile?.full_name ?? "Sistema"}
                </p>
              </li>
            )
          )}
          {(!history || history.length === 0) && (
            <li className="px-5 py-8 text-center text-sm text-slate-500">Nenhuma alteração registrada ainda.</li>
          )}
        </ul>
      </div>

      <div>
        <Link href="/certificados" className="text-xs text-slate-500 hover:text-slate-900">
          ← Voltar para certificados
        </Link>
      </div>
    </div>
  );
}
