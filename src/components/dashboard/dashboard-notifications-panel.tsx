"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BellOff, Download } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { StatusBadge } from "@/components/certificates/status-badge";
import { markNotificationRead, markAllNotificationsRead, markActivityNotificationRead, markAllActivityNotificationsRead } from "@/lib/notifications/actions";
import { withBasePath } from "@/lib/utils/base-path";
import type { CombinedNotification } from "@/lib/notifications/combined";

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 1) return "há poucos minutos";
  if (hours < 24) return `há cerca de ${hours}h`;
  const days = Math.round(hours / 24);
  return `há ${days} dia${days === 1 ? "" : "s"}`;
}

export function DashboardNotificationsPanel({ items }: { items: CombinedNotification[] }) {
  const [tab, setTab] = useState<"unread" | "read">("unread");
  const [isPending, startTransition] = useTransition();

  const unread = items.filter((item) => !item.isRead);
  const read = items.filter((item) => item.isRead);
  const visible = tab === "unread" ? unread : read;

  function markItemRead(item: CombinedNotification) {
    if (item.kind === "due") startTransition(() => markNotificationRead(item.due.certificate.id));
    else startTransition(() => markActivityNotificationRead(item.activity.id));
  }

  function markAllRead() {
    const dueIds = unread.filter((i) => i.kind === "due").map((i) => i.due.certificate.id);
    const activityIds = unread.filter((i) => i.kind === "activity").map((i) => i.activity.id);
    startTransition(async () => {
      await Promise.all([markAllNotificationsRead(dueIds), markAllActivityNotificationsRead(activityIds)]);
    });
  }

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex rounded-md border border-slate-200 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setTab("unread")}
            className={cn(
              "rounded px-2.5 py-1 font-medium",
              tab === "unread" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            Não lidas {unread.length > 0 && `(${unread.length})`}
          </button>
          <button
            type="button"
            onClick={() => setTab("read")}
            className={cn(
              "rounded px-2.5 py-1 font-medium",
              tab === "read" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            Lidas
          </button>
        </div>
        {tab === "unread" && unread.length > 0 && (
          <button
            type="button"
            disabled={isPending}
            onClick={markAllRead}
            className="text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="max-h-[28rem] flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 py-14 text-center">
            <BellOff size={22} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              {tab === "unread" ? "Tudo em dia!" : "Nenhuma notificação lida ainda."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visible.map((item) =>
              item.kind === "due" ? (
                <div key={item.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <Link href={`/clientes/${item.due.certificate.company_id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {item.due.certificate.company_corporate_name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                      Vence {formatDate(item.due.certificate.valid_to)}
                      <StatusBadge status={item.due.certificate.status} />
                    </p>
                  </Link>
                  {!item.isRead && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => markItemRead(item)}
                      className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Marcar como lida
                    </button>
                  )}
                </div>
              ) : (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <Download size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.activity.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.activity.message}</p>
                    <div className="mt-1 flex items-center gap-3">
                      {item.activity.action_path && (
                        <a
                          href={withBasePath(`/api/notifications/${item.activity.id}/download`)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          {item.activity.action_label ?? "Baixar"}
                        </a>
                      )}
                      <span className="text-xs text-slate-400">{timeAgo(item.activity.created_at)}</span>
                      {!item.isRead && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => markItemRead(item)}
                          className="text-xs font-medium text-slate-500 hover:text-slate-900"
                        >
                          Marcar como lida
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
