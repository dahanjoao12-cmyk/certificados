"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { StatusBadge } from "@/components/certificates/status-badge";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/notifications/actions";
import type { NotificationItem } from "@/lib/notifications/queries";

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function NotificationsBell({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const unread = items.filter((item) => !item.isRead);

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
                  onClick={() =>
                    startTransition(() => markAllNotificationsRead(unread.map((item) => item.certificate.id)))
                  }
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
                unread.slice(0, 10).map(({ certificate }) => (
                  <div
                    key={certificate.id}
                    className="flex items-start justify-between gap-2 border-b border-slate-50 px-3 py-2.5 last:border-0"
                  >
                    <Link href={`/clientes/${certificate.company_id}`} onClick={() => setOpen(false)} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{certificate.company_corporate_name}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        Vence {formatDate(certificate.valid_to)}
                        <StatusBadge status={certificate.status} />
                      </p>
                    </Link>
                    <button
                      type="button"
                      disabled={isPending}
                      title="Marcar como lida"
                      onClick={() => startTransition(() => markNotificationRead(certificate.id))}
                      className="shrink-0 rounded px-1.5 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      Lida
                    </button>
                  </div>
                ))
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
