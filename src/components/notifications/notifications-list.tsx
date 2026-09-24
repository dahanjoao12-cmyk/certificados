"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { StatusBadge } from "@/components/certificates/status-badge";
import {
  markNotificationRead,
  markAllNotificationsRead,
  markActivityNotificationRead,
  markAllActivityNotificationsRead,
} from "@/lib/notifications/actions";
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

export function NotificationsList({ items }: { items: CombinedNotification[] }) {
  const [isPending, startTransition] = useTransition();
  const unread = items.filter((item) => !item.isRead);

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

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-white py-16 text-center">
        <p className="text-sm text-slate-500">Nenhuma notificação no momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {unread.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={isPending}
            onClick={markAllRead}
            className="text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Marcar todas como lidas
          </button>
        </div>
      )}

      <div className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
        {items.map((item) =>
          item.kind === "due" ? (
            <div
              key={item.id}
              className={cn("flex items-center justify-between gap-3 px-4 py-3", item.isRead && "opacity-60")}
            >
              <Link href={`/clientes/${item.due.certificate.company_id}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{item.due.certificate.company_corporate_name}</p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                  Código {item.due.certificate.company_code} · Vence {formatDate(item.due.certificate.valid_to)}
                  <StatusBadge status={item.due.certificate.status} />
                </p>
              </Link>
              {item.isRead ? (
                <span className="shrink-0 text-xs text-slate-400">Lida</span>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => markItemRead(item)}
                  className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Marcar como lida
                </button>
              )}
            </div>
          ) : (
            <div key={item.id} className={cn("flex items-start gap-3 px-4 py-3", item.isRead && "opacity-60")}>
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
                      className="text-xs font-medium text-slate-600 hover:text-slate-900"
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
    </div>
  );
}
