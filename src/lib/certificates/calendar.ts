import type { SupabaseClient } from "@supabase/supabase-js";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { listAllCertificates } from "./queries";
import type { CertificateFilters } from "./filters";

export type CalendarView = "month" | "week";

export interface CalendarRange {
  from: Date;
  to: Date;
  /** Every day rendered in the grid, including the padding days from adjacent months/weeks. */
  days: Date[];
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Sunday-start range covering the visible grid for a month or week view. */
export function getCalendarRange(view: CalendarView, referenceDate: Date): CalendarRange {
  const from = view === "month" ? startOfWeek(startOfMonth(referenceDate)) : startOfWeek(referenceDate);
  const to = view === "month" ? endOfWeek(endOfMonth(referenceDate)) : endOfWeek(referenceDate);
  return { from, to, days: eachDayOfInterval({ start: from, end: to }) };
}

/** Moves the reference date one step forward/back for the given view (used by the </> nav buttons). */
export function shiftReferenceDate(view: CalendarView, referenceDate: Date, direction: 1 | -1): Date {
  if (view === "month") {
    return direction === 1 ? addMonths(referenceDate, 1) : subMonths(referenceDate, 1);
  }
  return direction === 1 ? addWeeks(referenceDate, 1) : subWeeks(referenceDate, 1);
}

/** Header label for the calendar ("setembro de 2026" or a week's date range). */
export function formatMonthLabel(view: CalendarView, referenceDate: Date, from: Date, to: Date): string {
  if (view === "week") {
    const sameMonth = from.getMonth() === to.getMonth();
    return sameMonth
      ? `${format(from, "d")} - ${format(to, "d 'de' MMMM", { locale: ptBR })}`
      : `${format(from, "d MMM", { locale: ptBR })} - ${format(to, "d MMM", { locale: ptBR })}`;
  }
  return format(referenceDate, "MMMM 'de' yyyy", { locale: ptBR });
}

export type CalendarCategory = "certificados" | "alvaras";

export interface CalendarItem {
  id: string;
  date: string;
  label: string;
  href: string;
  category: CalendarCategory;
}

/**
 * Vencimentos de certificado visíveis no intervalo. Alvarás tem sua própria
 * função equivalente (src/lib/alvaras/calendar-items.ts:listAlvaraCalendarItems)
 * -- o chamador concatena os dois arrays antes de passar pro calendário.
 */
export async function listCalendarItems(
  supabase: SupabaseClient,
  { from, to, includeOverdue }: { from: Date; to: Date; includeOverdue: boolean }
): Promise<CalendarItem[]> {
  const filters: CertificateFilters = {
    dueFrom: toISODate(from),
    dueTo: toISODate(to),
    archived: false,
    sort: "valid_to",
    dir: "asc",
    page: 1,
    pageSize: 1,
  };

  const certificates = await listAllCertificates(supabase, filters);

  return certificates
    .filter((cert) => includeOverdue || cert.status !== "VENCIDO")
    .map((cert) => ({
      id: cert.id,
      date: cert.valid_to,
      label: cert.company_corporate_name,
      href: `/clientes/${cert.company_id}`,
      category: "certificados" as const,
    }));
}
