-- ============================================================================
-- 0011_permission_groups.sql
-- Cadastro de grupos de usuários (nome + quais módulos o grupo teoricamente
-- cobre) e o grupo de cada usuário. Isto SÓ guarda o dado -- nenhuma tela ou
-- policy passa a checar module access ainda. Isso fica para um pacote
-- separado que vai efetivamente aplicar a permissão (RLS por módulo).
-- ============================================================================

create table if not exists permission_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create table if not exists permission_group_modules (
  group_id uuid not null references permission_groups(id) on delete cascade,
  module_key text not null,
  primary key (group_id, module_key)
);

alter table profiles add column if not exists group_id uuid references permission_groups(id) on delete set null;

alter table permission_groups enable row level security;
alter table permission_group_modules enable row level security;

create policy permission_groups_select on permission_groups
  for select using (auth.role() = 'authenticated');

create policy permission_groups_insert_admin on permission_groups
  for insert with check (is_admin());

create policy permission_groups_update_admin on permission_groups
  for update using (is_admin());

create policy permission_groups_delete_admin on permission_groups
  for delete using (is_admin());

create policy permission_group_modules_select on permission_group_modules
  for select using (auth.role() = 'authenticated');

create policy permission_group_modules_insert_admin on permission_group_modules
  for insert with check (is_admin());

create policy permission_group_modules_delete_admin on permission_group_modules
  for delete using (is_admin());
