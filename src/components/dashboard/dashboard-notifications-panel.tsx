"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BellOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { StatusBadge } from "@/components/certificates/status-badge";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/notifications/actions";
import type { NotificationItem } from "@/lib/notifications/queries";

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function DashboardNotificationsPanel({ items }: { items: NotificationItem[] }) {
  const [tab, setTab] = useState<"unread" | "read">("unread");
  const [isPending, startTransition] = useTransition();

  const unread = items.filter((item) => !item.isRead);
  const read = items.filter((item) => item.isRead);
  const visible = tab === "unread" ? unread : read;

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
            onClick={() => startTransition(() => markAllNotificationsRead(unread.map((item) => item.certificate.id)))}
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
            {visible.map(({ certificate, isRead }) => (
              <div key={certificate.id} className="flex items-center justify-between gap-2 px-4 py-3">
                <Link href={`/clientes/${certificate.company_id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{certificate.company_corporate_name}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                    Vence {formatDate(certificate.valid_to)}
                    <StatusBadge status={certificate.status} />
                  </p>
                </Link>
                {!isRead && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(() => markNotificationRead(certificate.id))}
                    className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Marcar como lida
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
