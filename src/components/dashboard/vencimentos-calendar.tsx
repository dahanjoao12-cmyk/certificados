"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format, isSameDay, isSameMonth, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { shiftReferenceDate, type CalendarItem, type CalendarView } from "@/lib/certificates/calendar";

const CATEGORY_LABELS: Record<CalendarItem["category"], string> = {
  certificados: "Certificados",
};

const CATEGORY_DOT_CLASSES: Record<CalendarItem["category"], string> = {
  certificados: "bg-blue-600",
};

const CATEGORY_CHIP_CLASSES: Record<CalendarItem["category"], string> = {
  certificados: "bg-blue-50 text-blue-700 hover:bg-blue-100",
};

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function VencimentosCalendar({
  view,
  referenceDate,
  showOverdue,
  display,
  days,
  monthLabel,
  items,
}: {
  view: CalendarView;
  referenceDate: string;
  showOverdue: boolean;
  display: "calendar" | "list";
  days: string[];
  monthLabel: string;
  items: CalendarItem[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = format(new Date(), "yyyy-MM-dd");
  const hiddenCategories = new Set(
    (searchParams.get("hideCategories") ?? "").split(",").filter(Boolean)
  );

  function pushParams(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    router.push(`?${params.toString()}`);
  }

  function navigate(direction: 1 | -1) {
    const next = shiftReferenceDate(view, parseISO(referenceDate), direction);
    pushParams({ date: format(next, "yyyy-MM-dd") });
  }

  function toggleCategory(category: string) {
    const next = new Set(hiddenCategories);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    pushParams({ hideCategories: next.size > 0 ? [...next].join(",") : undefined });
  }

  const visibleItems = items.filter((item) => !hiddenCategories.has(item.category));
  const itemsByDate = new Map<string, CalendarItem[]>();
  for (const item of visibleItems) {
    const list = itemsByDate.get(item.date) ?? [];
    list.push(item);
    itemsByDate.set(item.date, list);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            title="Anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="min-w-40 text-center text-sm font-semibold capitalize text-slate-900">{monthLabel}</p>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            title="Próximo"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => pushParams({ date: today })}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Hoje
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex rounded-md border border-slate-200 p-0.5">
            <button
              type="button"
              onClick={() => pushParams({ view: "month" })}
              className={cn(
                "rounded px-2 py-1 font-medium",
                view === "month" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              Mês
            </button>
            <button
              type="button"
              onClick={() => pushParams({ view: "week" })}
              className={cn(
                "rounded px-2 py-1 font-medium",
                view === "week" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              Semana
            </button>
          </div>

          <div className="flex rounded-md border border-slate-200 p-0.5">
            <button
              type="button"
              onClick={() => pushParams({ display: "calendar" })}
              className={cn(
                "rounded px-2 py-1 font-medium",
                display === "calendar" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              Calendário
            </button>
            <button
              type="button"
              onClick={() => pushParams({ display: "list" })}
              className={cn(
                "rounded px-2 py-1 font-medium",
                display === "list" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              Lista
            </button>
          </div>

          <label className="flex items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1.5 font-medium text-slate-600">
            <input
              type="checkbox"
              checked={showOverdue}
              onChange={(e) => pushParams({ showOverdue: e.target.checked ? undefined : "false" })}
              className="h-3.5 w-3.5 rounded border-slate-300"
            />
            Mostrar vencidos
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2">
        {(Object.keys(CATEGORY_LABELS) as CalendarItem["category"][]).map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => toggleCategory(category)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-opacity",
              CATEGORY_CHIP_CLASSES[category],
              hiddenCategories.has(category) && "opacity-40"
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", CATEGORY_DOT_CLASSES[category])} />
            {CATEGORY_LABELS[category]}
          </button>
        ))}
      </div>

      {display === "list" ? (
        <div className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
          {visibleItems.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">Nenhum vencimento no período.</p>
          ) : (
            [...visibleItems]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", CATEGORY_DOT_CLASSES[item.category])} />
                    <span className="truncate text-sm text-slate-900">{item.label}</span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">{formatDate(item.date)}</span>
                </Link>
              ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-7 border-t border-slate-100 text-xs">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((weekday) => (
            <div key={weekday} className="border-b border-slate-100 px-2 py-1.5 text-center font-medium text-slate-500">
              {weekday}
            </div>
          ))}
          {days.map((day) => {
            const dayItems = itemsByDate.get(day) ?? [];
            const inCurrentMonth = view === "week" || isSameMonth(parseISO(day), parseISO(referenceDate));
            const isCurrentDay = isSameDay(parseISO(day), parseISO(today));
            return (
              <div
                key={day}
                className={cn(
                  "min-h-24 border-b border-r border-slate-100 p-1.5 last:border-r-0",
                  !inCurrentMonth && "bg-slate-50/60"
                )}
              >
                <p
                  className={cn(
                    "mb-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                    isCurrentDay ? "bg-slate-900 font-semibold text-white" : "text-slate-500",
                    !inCurrentMonth && !isCurrentDay && "text-slate-300"
                  )}
                >
                  {format(parseISO(day), "d")}
                </p>
                <div className="max-h-16 space-y-1 overflow-y-auto">
                  {dayItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      title={item.label}
                      className={cn(
                        "block truncate rounded px-1.5 py-0.5 text-[11px] font-medium",
                        CATEGORY_CHIP_CLASSES[item.category]
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

