import { Plus, Paperclip } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { AlvaraStatusBadge } from "@/components/alvaras/status-badge";
import { AlvaraRowActions } from "@/components/alvaras/alvara-row-actions";
import type { AlvaraWithCompany } from "@/lib/types/database";

function formatDate(value: string | null): string {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function CompanyAlvarasSection({
  companyId,
  alvaras,
  isAdmin,
}: {
  companyId: string;
  alvaras: AlvaraWithCompany[];
  isAdmin: boolean;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Alvarás</h2>
        <ButtonLink href={`/clientes/${companyId}/alvaras/novo`} size="sm">
          <Plus size={13} /> Novo alvará
        </ButtonLink>
      </div>

      {alvaras.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">Nenhum alvará cadastrado para este cliente.</p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {alvaras.map((alvara) => (
            <li key={alvara.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: alvara.type_color }} />
                  {alvara.type_name}
                  {alvara.prioritario && <span className="text-amber-600">★</span>}
                  {alvara.attachment_name && <Paperclip size={12} className="text-slate-400" />}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {alvara.valid_to ? `Vence ${formatDate(alvara.valid_to)}` : "Sem data de vencimento"} · Condicionantes{" "}
                  {alvara.condicionantes_atendidas}/{alvara.condicionantes_total}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <AlvaraStatusBadge status={alvara.status} />
                <AlvaraRowActions alvaraId={alvara.id} companyId={companyId} archived={alvara.archived} isAdmin={isAdmin} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
