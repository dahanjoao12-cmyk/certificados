import { getCurrentUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { listNotifications } from "@/lib/notifications/queries";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const notifications = await listNotifications(supabase, user.id);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar isAdmin={user.profile.role === "admin"} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={user.profile.full_name} notifications={notifications} />
        <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
