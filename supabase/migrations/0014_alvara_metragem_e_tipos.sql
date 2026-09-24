-- ============================================================================
-- 0014_alvara_metragem_e_tipos.sql
-- 1) Troca os dois contadores de condicionantes por um único campo de
--    metragem (m²) -- decisão do usuário após ver a tela em produção; nenhum
--    dado real usava condicionantes ainda (todas as linhas da planilha antiga
--    tinham 0/0), então não há perda de dado real ao remover as colunas.
-- 2) Adiciona a flag "anexo compartilhado por município" em alvara_types,
--    usada pelo TLE (Licença para Estabelecimento): o mesmo documento vale
--    para todo estabelecimento do mesmo município, então um alvará TLE sem
--    anexo próprio herda o anexo de outro TLE do mesmo município.
-- ============================================================================

alter table alvaras add column if not exists metragem_m2 numeric(10, 2);
alter table alvara_types add column if not exists shared_attachment_by_municipality boolean not null default false;

-- alvaras_view precisa ser recriada (não só "or replace") porque estamos
-- removendo colunas da lista de saída, o que create-or-replace não permite.
drop view if exists alvaras_view;

create view alvaras_view
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
  co.active as company_active
from alvaras a
join alvara_types t on t.id = a.type_id
join companies co on co.id = a.company_id;

alter table alvaras drop column if exists condicionantes_total;
alter table alvaras drop column if exists condicionantes_atendidas;

-- ----------------------------------------------------------------------------
-- Catálogo real de tipos pedido pelo usuário. O tipo "SANITÁRIO" criado
-- manualmente durante os testes desta sessão é renomeado (mesmo id, evita
-- órfãos se algum alvará real já apontar pra ele) em vez de duplicado.
-- ----------------------------------------------------------------------------
update alvara_types set name = 'Alvará sanitário' where name = 'SANITÁRIO';

insert into alvara_types (name, color)
values
  ('Alvará de estabelecimento', '#d97706'),
  ('Alvará de bombeiro', '#dc2626'),
  ('TFE', '#7c3aed'),
  ('TLE', '#0891b2')
on conflict (name) do nothing;

update alvara_types set shared_attachment_by_municipality = true where name = 'TLE';
