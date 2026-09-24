-- ============================================================================
-- 0015_alvara_terceiros_e_emissao.sql
-- 1) Adiciona "TERCEIROS" como terceira situação manual de pré-emissão
--    (além de Aguardando/CGSIM).
-- 2) Adiciona a data de emissão do alvará (issued_at), separada da data de
--    vencimento (valid_to) -- só faz sentido quando o alvará já foi emitido.
-- ============================================================================

alter table alvaras drop constraint if exists alvaras_manual_status_check;
alter table alvaras add constraint alvaras_manual_status_check
  check (manual_status in ('AGUARDANDO', 'CGSIM', 'TERCEIROS'));

alter table alvaras add column if not exists issued_at date;

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
  a.metragem_m2,
  a.municipality,
  a.uf,
  a.notes,
  a.origin,
  a.created_at,
  a.updated_at,
  a.created_by,
  a.updated_by,
  a.attachment_path,
  a.attachment_name,
  a.attachment_size,
  a.attachment_uploaded_at,
  alvara_status(a.issued, a.is_permanent, a.manual_status, a.valid_to, a.archived) as status,
  alvara_status_priority(alvara_status(a.issued, a.is_permanent, a.manual_status, a.valid_to, a.archived)) as status_priority,
  case when a.valid_to is not null then (a.valid_to - current_date) else null end as days_remaining,
  t.name as type_name,
  t.color as type_color,
  t.shared_attachment_by_municipality as type_shared_attachment,
  co.code as company_code,
  co.document as company_document,
  co.document_type as company_document_type,
  co.corporate_name as company_corporate_name,
  co.trade_name as company_trade_name,
  co.short_name as company_short_name,
  co.active as company_active,
  a.issued_at
from alvaras a
join alvara_types t on t.id = a.type_id
join companies co on co.id = a.company_id;
