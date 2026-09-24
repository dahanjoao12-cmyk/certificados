import { FileCheck2, Stamp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCertificateStatusCounts } from "@/lib/certificates/queries";
import { getCalendarRange, listCalendarItems, formatMonthLabel, type CalendarView } from "@/lib/certificates/calendar";
import { getAlvaraStatusCounts } from "@/lib/alvaras/queries";
import { listAlvaraCalendarItems } from "@/lib/alvaras/calendar-items";
import { listNotifications } from "@/lib/notifications/queries";
import { ModuleCards, type ModuleCardDef } from "@/components/dashboard/module-cards";
import { VencimentosCalendar } from "@/components/dashboard/vencimentos-calendar";
import { DashboardNotificationsPanel } from "@/components/dashboard/dashboard-notifications-panel";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;

  const view: CalendarView = firstValue(params.view) === "week" ? "week" : "month";
  const display = firstValue(params.display) === "list" ? "list" : "calendar";
  const showOverdue = firstValue(params.showOverdue) !== "false";
  const referenceDateParam = firstValue(params.date);
  const referenceDate = referenceDateParam && !Number.isNaN(Date.parse(referenceDateParam))
    ? new Date(`${referenceDateParam}T00:00:00`)
    : new Date();

  const range = getCalendarRange(view, referenceDate);

  const supabase = await createClient();
  const user = await getCurrentUser();

  const [counts, alvaraCounts, certificateCalendarItems, alvaraCalendarItems, notifications] = await Promise.all([
    getCertificateStatusCounts(supabase),
    getAlvaraStatusCounts(supabase),
    listCalendarItems(supabase, { from: range.from, to: range.to, includeOverdue: showOverdue }),
    listAlvaraCalendarItems(supabase, { from: range.from, to: range.to, includeOverdue: showOverdue }),
    listNotifications(supabase, user.id),
  ]);
  const calendarItems = [...certificateCalendarItems, ...alvaraCalendarItems];

  const moduleCards: ModuleCardDef[] = [
    {
      key: "certificados",
      label: "Certificados Digitais",
      value: counts.active,
      icon: FileCheck2,
      href: "/painel-certificados",
      colorClasses: "bg-blue-50 text-blue-600",
    },
    {
      key: "alvaras",
      label: "Alvarás",
      value: alvaraCounts.active,
      icon: Stamp,
      href: "/alvaras",
      colorClasses: "bg-amber-50 text-amber-600",
    },
  ];

  const monthLabel = formatMonthLabel(view, referenceDate, range.from, range.to);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Visão geral dos módulos e vencimentos, {user.profile.full_name}.</p>
      </div>

      <ModuleCards cards={moduleCards} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <VencimentosCalendar
            view={view}
            referenceDate={referenceDate.toISOString().slice(0, 10)}
            showOverdue={showOverdue}
            display={display}
            days={range.days.map((d) => d.toISOString().slice(0, 10))}
            monthLabel={monthLabel}
            items={calendarItems}
          />
        </div>
        <div>
          <DashboardNotificationsPanel items={notifications} />
        </div>
      </div>
    </div>
  );
}
