import type { SupabaseClient } from "@supabase/supabase-js";
import type { CalendarItem } from "@/lib/certificates/calendar";
import type { AlvaraFilters } from "./filters";
import { listAllAlvaras } from "./queries";

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Vencimentos de alvará visíveis no intervalo -- só alvarás emitidos com data
 * entram aqui (pré-emissão e "definitivo" não têm data pra plotar, o que é o
 * comportamento esperado). Mesmo shape de
 * `certificates/calendar.ts:listCalendarItems`, categoria "alvaras".
 */
export async function listAlvaraCalendarItems(
  supabase: SupabaseClient,
  { from, to, includeOverdue }: { from: Date; to: Date; includeOverdue: boolean }
): Promise<CalendarItem[]> {
  const filters: AlvaraFilters = {
    dueFrom: toISODate(from),
    dueTo: toISODate(to),
    archived: false,
    sort: "valid_to",
    dir: "asc",
    page: 1,
    pageSize: 1,
  };

  const alvaras = await listAllAlvaras(supabase, filters);

  return alvaras
    .filter((alvara) => alvara.valid_to && (includeOverdue || alvara.status !== "VENCIDO"))
    .map((alvara) => ({
      id: alvara.id,
      date: alvara.valid_to as string,
      label: `${alvara.company_corporate_name} · ${alvara.type_name}`,
      href: `/clientes/${alvara.company_id}`,
      category: "alvaras" as const,
    }));
}
