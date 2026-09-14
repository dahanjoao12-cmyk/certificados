"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileCheck2,
  Building2,
  FileBarChart,
  UploadCloud,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS: { href: string; label: string; icon: typeof FileCheck2; exact?: boolean }[] = [
  { href: "/", label: "Certificados", icon: FileCheck2, exact: true },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { href: "/importar", label: "Importar", icon: UploadCloud },
];

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-56 flex-col border-r border-slate-200 bg-white px-3 py-4">
      <div className="mb-6 px-2">
        <p className="text-sm font-semibold text-slate-900">Certificados</p>
        <p className="text-xs text-slate-500">Gestão interna</p>
      </div>

      <ul className="flex-1 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <Icon size={16} strokeWidth={2} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <ul className="space-y-0.5 border-t border-slate-200 pt-2">
        {isAdmin && (
          <li>
            <Link
              href="/usuarios"
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/usuarios")
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <Users size={16} strokeWidth={2} />
              Usuários
            </Link>
          </li>
        )}
        <li>
          <Link
            href="/configuracoes"
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/configuracoes")
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Settings size={16} strokeWidth={2} />
            Configurações
          </Link>
        </li>
      </ul>
    </nav>
  );
}
