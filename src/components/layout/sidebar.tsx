"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileCheck2,
  Building2,
  Building,
  FileBarChart,
  UploadCloud,
  Bell,
  Settings,
  Users,
  FolderKanban,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS: { href: string; label: string; icon: typeof FileCheck2; exact?: boolean }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/painel-certificados", label: "Certificados", icon: FileCheck2 },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { href: "/importar", label: "Importar", icon: UploadCloud },
];

interface GestaoItem {
  href: string;
  label: string;
  icon: typeof Building2;
  adminOnly?: boolean;
}

const GESTAO_ITEMS: GestaoItem[] = [
  { href: "/usuarios", label: "Usuários", icon: Users, adminOnly: true },
  { href: "/clientes", label: "Clientes", icon: Building2 },
  { href: "/organizacao", label: "Minha Organização", icon: Building },
];

function NavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: typeof Building2; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
        active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
      )}
    >
      <Icon size={16} strokeWidth={2} />
      {label}
    </Link>
  );
}

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const gestaoItems = GESTAO_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const gestaoActive = gestaoItems.some((item) => pathname.startsWith(item.href));
  const [gestaoOpen, setGestaoOpen] = useState(gestaoActive);

  return (
    <nav className="flex h-full w-56 flex-col border-r border-slate-200 bg-white px-3 py-4">
      <div className="mb-6 px-2">
        <p className="text-sm font-semibold text-slate-900">Certificados</p>
        <p className="text-xs text-slate-500">Gestão interna</p>
      </div>

      <ul className="flex-1 space-y-0.5">
        <li>
          <button
            type="button"
            onClick={() => setGestaoOpen((v) => !v)}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
              gestaoActive && !gestaoOpen ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <FolderKanban size={16} strokeWidth={2} />
            <span className="flex-1 text-left">Gestão</span>
            {gestaoOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          {gestaoOpen && (
            <ul className="mt-0.5 space-y-0.5 pl-4">
              {gestaoItems.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href} label={item.label} icon={item.icon} active={pathname.startsWith(item.href)} />
                </li>
              ))}
            </ul>
          )}
        </li>

        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <NavLink
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={item.exact ? pathname === item.href : pathname.startsWith(item.href)}
            />
          </li>
        ))}
      </ul>

      <ul className="space-y-0.5 border-t border-slate-200 pt-2">
        <li>
          <NavLink href="/configuracoes" label="Configurações" icon={Settings} active={pathname.startsWith("/configuracoes")} />
        </li>
      </ul>
    </nav>
  );
}
