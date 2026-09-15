-- ============================================================================
-- 0007_notifications.sql
-- Internal notifications: certificates due/vencendo/vencido/vence_hoje are not
-- stored as generated rows -- they are derived on the fly from
-- certificates_view (status). This table only tracks which certificate each
-- user has already seen/dismissed, so a notification "stays available until
-- viewed or marked as read" per user (section: alertas internos).
-- ============================================================================

create table if not exists notification_reads (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references certificates(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  constraint notification_reads_unique unique (certificate_id, user_id)
);

create index if not exists notification_reads_user_id_idx on notification_reads (user_id);

alter table notification_reads enable row level security;

create policy notification_reads_select on notification_reads
  for select using (user_id = auth.uid());

create policy notification_reads_insert on notification_reads
  for insert with check (user_id = auth.uid());

create policy notification_reads_delete on notification_reads
  for delete using (user_id = auth.uid());
