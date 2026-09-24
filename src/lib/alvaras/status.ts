import type { AlvaraStatus } from "@/lib/types/database";

/**
 * Mirrors the SQL function `alvara_status` in
 * supabase/migrations/0012_alvaras.sql. Optimistic-UI only -- any
 * filtering/sorting/report must query `alvaras_view` instead. If you change
 * the rule here, change it there too.
 */
export function computeAlvaraStatus(params: {
  issued: boolean;
  isPermanent: boolean;
  manualStatus: "AGUARDANDO" | "CGSIM";
  validTo: string | Date | null;
  archived: boolean;
  warningDays: number;
}): AlvaraStatus {
  const { issued, isPermanent, manualStatus, validTo, archived, warningDays } = params;
  if (archived) return "ARQUIVADO";
  if (!issued) return manualStatus;
  if (isPermanent) return "DEFINITIVO";
  if (!validTo) return manualStatus;

  const today = startOfDay(new Date());
  const dueDate = startOfDay(validTo);
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) return "VENCIDO";
  if (diffDays === 0) return "VENCE_HOJE";
  if (diffDays <= warningDays) return "VENCENDO";
  return "EM_DIA";
}

/** Same local-midnight parsing caveat as certificates/status.ts -- see that file's comment. */
function startOfDay(value: string | Date): Date {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const ALVARA_STATUS_LABELS: Record<AlvaraStatus, string> = {
  AGUARDANDO: "Aguardando",
  CGSIM: "CGSIM",
  EM_DIA: "Em dia",
  VENCENDO: "Vencendo",
  VENCE_HOJE: "Vence hoje",
  VENCIDO: "Vencido",
  DEFINITIVO: "Definitivo",
  ARQUIVADO: "Arquivado",
};

export const ALVARA_STATUS_BADGE_CLASSES: Record<AlvaraStatus, string> = {
  AGUARDANDO: "bg-slate-100 text-slate-600 ring-slate-500/20",
  CGSIM: "bg-purple-50 text-purple-700 ring-purple-600/20",
  EM_DIA: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  VENCENDO: "bg-amber-50 text-amber-700 ring-amber-600/20",
  VENCE_HOJE: "bg-orange-50 text-orange-700 ring-orange-600/20",
  VENCIDO: "bg-red-50 text-red-700 ring-red-600/20",
  DEFINITIVO: "bg-blue-50 text-blue-700 ring-blue-600/20",
  ARQUIVADO: "bg-gray-100 text-gray-600 ring-gray-500/20",
};
