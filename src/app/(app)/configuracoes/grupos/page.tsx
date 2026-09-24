import { getCurrentUser, requireAdmin } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { listPermissionGroups } from "@/lib/permission-groups/queries";
import { GroupsManager } from "@/components/permission-groups/groups-manager";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const user = await getCurrentUser();
  requireAdmin(user);

  const supabase = await createClient();
  const groups = await listPermissionGroups(supabase);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Grupos de usuários</h1>
        <p className="text-sm text-slate-500">
          Defina grupos e atribua usuários a eles em <span className="font-medium">Usuários</span>.
        </p>
      </div>

      <GroupsManager groups={groups} />
    </div>
  );
}
