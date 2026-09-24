import { getCurrentUser, requireAdmin } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { NewUserForm } from "@/components/users/new-user-form";
import { UserRowActions } from "@/components/users/user-row-actions";
import type { Profile } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const currentUser = await getCurrentUser();
  requireAdmin(currentUser);

  const supabase = await createClient();
  const [{ data: profiles }, { data: groups }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("permission_groups").select("id, name").order("name"),
  ]);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Usuários</h1>
        <p className="text-sm text-slate-500">Gerencie quem tem acesso ao sistema.</p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Novo usuário</h2>
        <NewUserForm />
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2.5">Nome</th>
              <th className="px-4 py-2.5">E-mail</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5">Perfil / Grupo / Ações</th>
            </tr>
          </thead>
          <tbody>
            {((profiles ?? []) as Profile[]).map((profile) => (
              <tr key={profile.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2.5 font-medium text-slate-900">
                  {profile.full_name}
                  {profile.id === currentUser.id && <span className="ml-1 text-xs text-slate-400">(você)</span>}
                </td>
                <td className="px-4 py-2.5 text-slate-700">{profile.email}</td>
                <td className="px-4 py-2.5">
                  {profile.active ? (
                    <span className="text-emerald-700">Ativo</span>
                  ) : (
                    <span className="text-slate-400">Inativo</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <UserRowActions
                    profileId={profile.id}
                    role={profile.role}
                    active={profile.active}
                    groupId={profile.group_id}
                    groups={groups ?? []}
                    isSelf={profile.id === currentUser.id}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
