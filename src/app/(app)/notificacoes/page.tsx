import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listCombinedNotifications } from "@/lib/notifications/combined";
import { NotificationsList } from "@/components/notifications/notifications-list";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const items = await listCombinedNotifications(supabase, user.id);

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Notificações</h1>
        <p className="text-sm text-slate-500">
          Certificados/alvarás vencendo e arquivos exportados prontos para baixar de novo. Ficam aqui até serem
          marcados como lidos.
        </p>
      </div>
      <NotificationsList items={items} />
    </div>
  );
}
