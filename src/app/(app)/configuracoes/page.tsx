import Link from "next/link";
import { Bell, Users, Stamp } from "lucide-react";

const CARDS = [
  {
    href: "/configuracoes/notificacoes",
    icon: Bell,
    title: "Notificações de Vencimento",
    description: "Prazo de aviso e destinatários de certificados — com prazo por certificado onde faz sentido.",
  },
  {
    href: "/configuracoes/grupos",
    icon: Users,
    title: "Grupos de usuários",
    description: "Defina quais módulos cada grupo cobre — e aplique a vários usuários de uma vez.",
  },
  {
    href: "/configuracoes/alvara-tipos",
    icon: Stamp,
    title: "Tipos de Alvará",
    description: "Cadastro dos tipos de alvará (nome e cor) usados na tabela e no calendário do Dashboard.",
  },
];

export default function SettingsHubPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500">Regras e cadastros usados em todo o sistema.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-md border border-slate-200 bg-white p-4 hover:border-slate-400 hover:bg-slate-50"
            >
              <Icon size={18} className="mb-2 text-slate-500" />
              <p className="text-sm font-medium text-slate-900">{card.title}</p>
              <p className="mt-1 text-xs text-slate-500">{card.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
