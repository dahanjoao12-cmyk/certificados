-- ============================================================================
-- 0013_alvara_attachments.sql
-- Anexo de arquivo por alvará (ex.: PDF do alvará emitido). Primeira vez que
-- o projeto usa Supabase Storage -- bucket privado (não listável
-- publicamente), todo acesso de download passa por URL assinada de curta
-- duração gerada no servidor (ver src/app/api/alvaras/[id]/attachment/route.ts),
-- nunca por um link público direto.
-- ============================================================================

alter table alvaras add column if not exists attachment_path text;
alter table alvaras add column if not exists attachment_name text;
alter table alvaras add column if not exists attachment_size int;
alter table alvaras add column if not exists attachment_uploaded_at timestamptz;

-- Re-declara alvaras_view (0002-style create or replace) só pra expor as 4
-- colunas novas -- adicionar colunas no fim de uma view existente é seguro,
-- não quebra nada que já leia as colunas antigas.
create or replace view alvaras_view
with (security_invoker = true)
as
select
  a.id,
  a.company_id,
  a.type_id,
  a.manual_status,
  a.issued,
  a.is_permanent,
  a.valid_to,
  a.prioritario,
  a.archived,
  a.condicionantes_total,
  a.condicionantes_atendidas,
  a.municipality,
  a.uf,
  a.notes,
  a.origin,
  a.created_at,
  a.updated_at,
  a.created_by,
  a.updated_by,
  alvara_status(a.issued, a.is_permanent, a.manual_status, a.valid_to, a.archived) as status,
  alvara_status_priority(alvara_status(a.issued, a.is_permanent, a.manual_status, a.valid_to, a.archived)) as status_priority,
  case when a.valid_to is not null then (a.valid_to - current_date) else null end as days_remaining,
  t.name as type_name,
  t.color as type_color,
  co.code as company_code,
  co.document as company_document,
  co.document_type as company_document_type,
  co.corporate_name as company_corporate_name,
  co.trade_name as company_trade_name,
  co.short_name as company_short_name,
  co.active as company_active,
  a.attachment_path,
  a.attachment_name,
  a.attachment_size,
  a.attachment_uploaded_at
from alvaras a
join alvara_types t on t.id = a.type_id
join companies co on co.id = a.company_id;

insert into storage.buckets (id, name, public)
values ('alvara-anexos', 'alvara-anexos', false)
on conflict (id) do nothing;

-- Mesmo padrão de RLS da tabela alvaras: qualquer usuário autenticado pode
-- ler/gravar/substituir/remover um anexo (RBAC simples, sem granularidade
-- por módulo -- limitação já deliberada no resto do projeto).
create policy alvara_anexos_select on storage.objects
  for select using (bucket_id = 'alvara-anexos' and auth.role() = 'authenticated');
create policy alvara_anexos_insert on storage.objects
  for insert with check (bucket_id = 'alvara-anexos' and auth.role() = 'authenticated');
create policy alvara_anexos_update on storage.objects
  for update using (bucket_id = 'alvara-anexos' and auth.role() = 'authenticated');
create policy alvara_anexos_delete on storage.objects
  for delete using (bucket_id = 'alvara-anexos' and auth.role() = 'authenticated');
