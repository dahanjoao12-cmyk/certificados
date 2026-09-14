import type { CertificateStatus } from "@/lib/types/database";

/**
 * Mirrors the SQL function `certificate_status` in
 * supabase/migrations/0002_functions_and_views.sql.
 *
 * This copy exists ONLY for optimistic UI (e.g. showing a status badge right
 * after a form submit, before refetching). Any filtering, sorting, or report
 * that needs to be correct across the whole dataset MUST query
 * `certificates_view` in the database instead of recomputing this client-side
 * -- that view is the single source of truth. If you change the rule here,
 * change it there too.
 */
export function computeCertificateStatus(
  validTo: string | Date,
  archived: boolean,
  warningDays: number
): CertificateStatus {
  if (archived) return "ARQUIVADO";

  const today = startOfDay(new Date());
  const dueDate = startOfDay(validTo);
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) return "VENCIDO";
  if (diffDays === 0) return "VENCE_HOJE";
  if (diffDays <= warningDays) return "VENCENDO";
  return "EM_DIA";
}

export function daysRemaining(validTo: string | Date): number {
  const today = startOfDay(new Date());
  const dueDate = startOfDay(validTo);
  return Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
}

/**
 * Normalizes to local midnight. Critically, a "yyyy-mm-dd" string (what a
 * Postgres `date` column serializes as) is parsed as LOCAL midnight here,
 * NOT via `new Date(string)` -- the JS spec parses a date-only ISO string as
 * UTC midnight, which silently shifts it a day earlier than intended in any
 * timezone behind UTC (this bit us: caught by a unit test, see
 * status.test.ts).
 */
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

export const CERTIFICATE_STATUS_LABELS: Record<CertificateStatus, string> = {
  EM_DIA: "Em dia",
  VENCENDO: "Vencendo",
  VENCE_HOJE: "Vence hoje",
  VENCIDO: "Vencido",
  ARQUIVADO: "Arquivado",
};

export const CERTIFICATE_STATUS_BADGE_CLASSES: Record<CertificateStatus, string> = {
  EM_DIA: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  VENCENDO: "bg-amber-50 text-amber-700 ring-amber-600/20",
  VENCE_HOJE: "bg-orange-50 text-orange-700 ring-orange-600/20",
  VENCIDO: "bg-red-50 text-red-700 ring-red-600/20",
  ARQUIVADO: "bg-gray-100 text-gray-600 ring-gray-500/20",
};
