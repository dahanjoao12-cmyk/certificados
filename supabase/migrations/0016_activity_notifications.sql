-- ============================================================================
-- 0016_activity_notifications.sql
-- Notificações de atividade (eventos reais, ao contrário dos alertas de
-- vencimento de certificado/alvará, que são sempre derivados ao vivo e nunca
-- guardados). Primeiro tipo: "export_ready" -- toda exportação (certificados
-- ou alvarás) já baixa na hora como sempre, mas agora TAMBÉM guarda uma cópia
-- no Storage e cria essa notificação, permitindo baixar de novo depois pelo
-- painel do Dashboard/sino, mesmo depois de fechar a aba.
-- ============================================================================

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('export_ready')),
  title text not null,
  message text not null,
  action_label text,
  action_path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on notifications (user_id);
create index if not exists notifications_created_at_idx on notifications (created_at desc);

alter table notifications enable row level security;

create policy notifications_select on notifications
  for select using (user_id = auth.uid());
create policy notifications_insert on notifications
  for insert with check (user_id = auth.uid());
create policy notifications_update on notifications
  for update using (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('exports', 'exports', false)
on conflict (id) do nothing;

-- Cada usuário só acessa a própria pasta (primeiro segmento do caminho =
-- seu user id) -- exportação pode conter dados de clientes reais.
create policy exports_select_own on storage.objects
  for select using (bucket_id = 'exports' and (storage.foldername(name))[1] = auth.uid()::text);
create policy exports_insert_own on storage.objects
  for insert with check (bucket_id = 'exports' and (storage.foldername(name))[1] = auth.uid()::text);
