import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { StatusCounts } from "@/lib/certificates/queries";

interface CardDef {
  key: string;
  label: string;
  value: number;
  activeClasses: string;
  query: URLSearchParams;
}

export function StatusCards({
  counts,
  currentQuery,
  activeStatus,
  activeArchived,
}: {
  counts: StatusCounts;
  currentQuery: string;
  activeStatus?: string;
  activeArchived?: string;
}) {
  function buildQuery(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(currentQuery);
    params.delete("status");
    params.delete("archived");
    params.delete("page");
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    return params;
  }

  const cards: CardDef[] = [
    {
      key: "active",
      label: "Ativos",
      value: counts.active,
      activeClasses: "border-slate-900",
      query: buildQuery({ archived: "false" }),
    },
    {
      key: "em_dia",
      label: "Em dia",
      value: counts.em_dia,
      activeClasses: "border-emerald-600",
      query: buildQuery({ status: "EM_DIA" }),
    },
    {
      key: "vencendo",
      label: "Vencendo",
      value: counts.vencendo,
      activeClasses: "border-amber-600",
      query: buildQuery({ status: "VENCENDO" }),
    },
    {
      key: "vencido",
      label: "Vencidos",
      value: counts.vencido,
      activeClasses: "border-red-600",
      query: buildQuery({ status: "VENCIDO" }),
    },
    {
      key: "arquivado",
      label: "Arquivados",
      value: counts.arquivado,
      activeClasses: "border-gray-500",
      query: buildQuery({ archived: "true" }),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const isActive =
          (card.key === "active" && activeArchived === "false") ||
          (card.key === "arquivado" && activeArchived === "true") ||
          (card.key !== "active" && card.key !== "arquivado" && activeStatus === card.query.get("status"));

        return (
          <Link
            key={card.key}
            href={`?${card.query.toString()}`}
            className={cn(
              "rounded-lg border bg-white px-4 py-3 shadow-sm transition-colors hover:border-slate-400",
              isActive ? card.activeClasses : "border-slate-200"
            )}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{card.value.toLocaleString("pt-BR")}</p>
          </Link>
        );
      })}
    </div>
  );
}
