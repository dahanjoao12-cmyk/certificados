"use client";

import { useTransition } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { StatusBadge } from "@/components/certificates/status-badge";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/notifications/actions";
import type { NotificationItem } from "@/lib/notifications/queries";

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function NotificationsList({ items }: { items: NotificationItem[] }) {
  const [isPending, startTransition] = useTransition();
  const unread = items.filter((item) => !item.isRead);

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-white py-16 text-center">
        <p className="text-sm text-slate-500">Nenhum certificado vencendo, vencido ou vencendo hoje no momento.</p>
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
            onClick={() => startTransition(() => markAllNotificationsRead(unread.map((item) => item.certificate.id)))}
            className="text-xs font-medium text-slate-600 hover:text-slate-900"
          >
            Marcar todas como lidas
          </button>
        </div>
      )}

      <div className="divide-y divide-slate-100 rounded-md border border-slate-200 bg-white">
        {items.map(({ certificate, isRead }) => (
          <div
            key={certificate.id}
            className={cn("flex items-center justify-between gap-3 px-4 py-3", isRead && "opacity-60")}
          >
            <Link href={`/clientes/${certificate.company_id}`} className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{certificate.company_corporate_name}</p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                Código {certificate.company_code} · Vence {formatDate(certificate.valid_to)}
                <StatusBadge status={certificate.status} />
              </p>
            </Link>
            {isRead ? (
              <span className="shrink-0 text-xs text-slate-400">Lida</span>
            ) : (
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => markNotificationRead(certificate.id))}
                className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Marcar como lida
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
