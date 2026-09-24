"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, Download } from "lucide-react";
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

export function NotificationsBell({ items }: { items: CombinedNotification[] }) {
  const [open, setOpen] = useState(false);
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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Notificações"
        className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <Bell size={16} />
        {unread.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium leading-none text-white">
            {unread.length > 99 ? "99+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fechar notificações"
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <p className="text-sm font-medium text-slate-900">Notificações</p>
              {unread.length > 0 && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={markAllRead}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {unread.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-slate-500">Nenhuma notificação pendente.</p>
              ) : (
                unread.slice(0, 10).map((item) =>
                  item.kind === "due" ? (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-2 border-b border-slate-50 px-3 py-2.5 last:border-0"
                    >
                      <Link
                        href={`/clientes/${item.due.certificate.company_id}`}
                        onClick={() => setOpen(false)}
                        className="min-w-0 flex-1"
                      >
                        <p className="truncate text-sm font-medium text-slate-900">
                          {item.due.certificate.company_corporate_name}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          Vence {formatDate(item.due.certificate.valid_to)}
                          <StatusBadge status={item.due.certificate.status} />
                        </p>
                      </Link>
                      <button
                        type="button"
                        disabled={isPending}
                        title="Marcar como lida"
                        onClick={() => markItemRead(item)}
                        className="shrink-0 rounded px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        Lida
                      </button>
                    </div>
                  ) : (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 border-b border-slate-50 px-3 py-2.5 last:border-0"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <Download size={12} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{item.activity.title}</p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                          {item.activity.action_path && (
                            <a
                              href={withBasePath(`/api/notifications/${item.activity.id}/download`)}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-emerald-600 hover:text-emerald-700"
                            >
                              {item.activity.action_label ?? "Baixar"}
                            </a>
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isPending}
                        title="Marcar como lida"
                        onClick={() => markItemRead(item)}
                        className="shrink-0 rounded px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        Lida
                      </button>
                    </div>
                  )
                )
              )}
            </div>

            <div className="border-t border-slate-100 px-3 py-2 text-center">
              <Link href="/notificacoes" onClick={() => setOpen(false)} className="text-xs text-slate-600 hover:text-slate-900">
                Ver todas as notificações
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
