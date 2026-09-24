import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { AlvaraStatusCounts } from "@/lib/alvaras/queries";

interface CardDef {
  key: string;
  label: string;
  value: number;
  activeClasses: string;
  bgClasses: string;
  query: URLSearchParams;
}

export function AlvaraStatusCards({
  counts,
  currentQuery,
  activeStatus,
  activeArchived,
}: {
  counts: AlvaraStatusCounts;
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
      bgClasses: "bg-white",
      query: buildQuery({ archived: "false" }),
    },
    {
      key: "pendentes",
      label: "Pendentes",
      value: counts.pendentes,
      activeClasses: "border-slate-500",
      bgClasses: "bg-slate-50",
      query: buildQuery({ status: "AGUARDANDO" }),
    },
    {
      key: "vencendo",
      label: "Vencendo",
      value: counts.vencendo,
      activeClasses: "border-amber-600",
      bgClasses: "bg-amber-50",
      query: buildQuery({ status: "VENCENDO" }),
    },
    {
      key: "vencido",
      label: "Vencidos",
      value: counts.vencido,
      activeClasses: "border-red-600",
      bgClasses: "bg-red-50",
      query: buildQuery({ status: "VENCIDO" }),
    },
    {
      key: "arquivado",
      label: "Arquivados",
      value: counts.arquivado,
      activeClasses: "border-gray-500",
      bgClasses: "bg-white",
      query: buildQuery({ archived: "true" }),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const isActive =
          (card.key === "active" && activeArchived === "false") ||
          (card.key === "arquivado" && activeArchived === "true") ||
          (card.key === "pendentes" && activeStatus === "AGUARDANDO") ||
          (card.key !== "active" && card.key !== "arquivado" && card.key !== "pendentes" && activeStatus === card.query.get("status"));

        return (
          <Link
            key={card.key}
            href={`?${card.query.toString()}`}
            className={cn(
              "rounded-lg border px-4 py-3 shadow-sm transition-colors hover:border-slate-400",
              card.bgClasses,
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
