-- ============================================================================
-- 0012_alvaras.sql
-- Módulo de Alvarás: controle de validade de alvarás/licenças municipais,
-- mesmo espírito de certificates (nunca lê/processa o documento em si, só a
-- data e o status). Diferente de certificates, um alvará pode não ter data
-- ainda (pré-emissão) -- daí o modelo de "tri-estado" abaixo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- alvara_types: tipos de alvará cadastráveis pelo escritório (nome + cor),
-- diferente de certificates.type/model que são check constraints fixos --
-- aqui o catálogo muda com o tempo (o import também cria tipos on the fly).
-- ----------------------------------------------------------------------------
create table if not exists alvara_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#2563eb',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alvara_types_name_unique unique (name)
);

-- ----------------------------------------------------------------------------
-- alvaras: um registro por (empresa, tipo). Tri-estado:
--   1) not issued            -> pré-emissão, manual_status manda, valid_to nulo
--   2) issued + is_permanent -> emitido "definitivo", nunca vence, valid_to nulo
--   3) issued + not permanent-> emitido com data, status calculado ao vivo
-- ----------------------------------------------------------------------------
create table if not exists alvaras (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  type_id uuid not null references alvara_types(id) on delete restrict,
  manual_status text not null default 'AGUARDANDO' check (manual_status in ('AGUARDANDO', 'CGSIM')),
  issued boolean not null default false,
  is_permanent boolean not null default false,
  valid_to date,
  prioritario boolean not null default false,
  archived boolean not null default false,
  condicionantes_total int not null default 0 check (condicionantes_total >= 0),
  condicionantes_atendidas int not null default 0 check (
    condicionantes_atendidas >= 0 and condicionantes_atendidas <= condicionantes_total
  ),
  municipality text,
  uf text check (uf is null or char_length(uf) = 2),
  notes text,
  origin text not null default 'manual' check (origin in ('manual', 'import')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  constraint alvaras_status_consistency check (
    (not issued and valid_to is null and not is_permanent)
    or (issued and is_permanent and valid_to is null)
    or (issued and not is_permanent and valid_to is not null)
  )
);

create index if not exists alvaras_company_id_idx on alvaras (company_id);
create index if not exists alvaras_type_id_idx on alvaras (type_id);
create index if not exists alvaras_valid_to_idx on alvaras (valid_to);
create index if not exists alvaras_archived_idx on alvaras (archived);
create index if not exists alvaras_issued_idx on alvaras (issued);

-- ----------------------------------------------------------------------------
-- alvara_history: audit trail, mesmo padrão de certificate_history (append-only)
-- ----------------------------------------------------------------------------
create table if not exists alvara_history (
  id uuid primary key default gen_random_uuid(),
  alvara_id uuid references alvaras(id) on delete set null,
  company_id uuid not null references companies(id) on delete cascade,
  action text not null check (action in ('created', 'updated', 'issued', 'archived', 'restored', 'deleted')),
  field_changed text,
  old_value text,
  new_value text,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);

create index if not exists alvara_history_company_id_idx on alvara_history (company_id);
create index if not exists alvara_history_alvara_id_idx on alvara_history (alvara_id);
create index if not exists alvara_history_changed_at_idx on alvara_history (changed_at desc);

-- ----------------------------------------------------------------------------
-- alvara_imports / alvara_import_rows: cópia estrutural de imports/import_rows,
-- em tabelas próprias (evita alterar o check constraint de result em
-- import_rows, que já tem histórico real em produção).
-- ----------------------------------------------------------------------------
create table if not exists alvara_imports (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  mapping jsonb not null default '{}'::jsonb,
  total_rows int not null default 0,
  alvaras_created int not null default 0,
  alvaras_updated int not null default 0,
  types_created int not null default 0,
  errors int not null default 0,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  imported_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists alvara_imports_created_at_idx on alvara_imports (created_at desc);

create table if not exists alvara_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references alvara_imports(id) on delete cascade,
  row_number int not null,
  raw_data jsonb not null,
  result text not null check (result in ('alvara_created', 'alvara_updated', 'type_created', 'error', 'skipped')),
  message text,
  company_id uuid references companies(id),
  alvara_id uuid references alvaras(id)
);

create index if not exists alvara_import_rows_import_id_idx on alvara_import_rows (import_id);
create index if not exists alvara_import_rows_result_idx on alvara_import_rows (result);

-- ----------------------------------------------------------------------------
-- Status: mesma ideia de certificate_status()/certificates_view, mas
-- ciente do tri-estado (sem data ainda / definitivo / com data).
-- ----------------------------------------------------------------------------
create or replace function get_alvara_warning_days()
returns int
language sql
stable
as $$
  select coalesce(
    (select (value ->> 'warning_days')::int from settings where key = 'alvara_thresholds'),
    30
  );
$$;

create or replace function alvara_status(
  p_issued boolean,
  p_is_permanent boolean,
  p_manual_status text,
  p_valid_to date,
  p_archived boolean,
  p_warning_days int default null
)
returns text
language sql
stable
as $$
  select case
    when p_archived then 'ARQUIVADO'
    when not p_issued then p_manual_status
    when p_is_permanent then 'DEFINITIVO'
    when p_valid_to < current_date then 'VENCIDO'
    when p_valid_to = current_date then 'VENCE_HOJE'
    when p_valid_to <= current_date + coalesce(p_warning_days, get_alvara_warning_days()) then 'VENCENDO'
    else 'EM_DIA'
  end;
$$;

create or replace function alvara_status_priority(p_status text)
returns int
language sql
immutable
as $$
  select case p_status
    when 'VENCIDO' then 0
    when 'VENCE_HOJE' then 1
    when 'VENCENDO' then 2
    when 'CGSIM' then 3
    when 'AGUARDANDO' then 4
    when 'EM_DIA' then 5
    when 'DEFINITIVO' then 6
    when 'ARQUIVADO' then 7
    else 8
  end;
$$;

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
  co.active as company_active
from alvaras a
join alvara_types t on t.id = a.type_id
join companies co on co.id = a.company_id;

drop trigger if exists alvara_types_set_updated_at on alvara_types;
create trigger alvara_types_set_updated_at before update on alvara_types
  for each row execute function set_updated_at();

drop trigger if exists alvaras_set_updated_at on alvaras;
create trigger alvaras_set_updated_at before update on alvaras
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- settings seed: limiar padrão de "vencendo" para alvarás, separado do de
-- certificados (certificate_thresholds).
-- ----------------------------------------------------------------------------
insert into settings (key, value)
values ('alvara_thresholds', jsonb_build_object('warning_days', 30))
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- RLS -- mesmo padrão de certificates (select/insert/update=authenticated,
-- delete=admin); alvara_history/alvara_import_rows/alvara_imports são
-- append-only (só select+insert). Nenhuma tabela aqui usa .upsert(), então
-- nenhuma precisa de policy de update só por causa de onConflict.
-- ----------------------------------------------------------------------------
alter table alvara_types enable row level security;
alter table alvaras enable row level security;
alter table alvara_history enable row level security;
alter table alvara_imports enable row level security;
alter table alvara_import_rows enable row level security;

create policy alvara_types_select on alvara_types
  for select using (auth.role() = 'authenticated');
create policy alvara_types_insert on alvara_types
  for insert with check (auth.role() = 'authenticated');
create policy alvara_types_update on alvara_types
  for update using (auth.role() = 'authenticated');
create policy alvara_types_delete_admin on alvara_types
  for delete using (is_admin());

create policy alvaras_select on alvaras
  for select using (auth.role() = 'authenticated');
create policy alvaras_insert on alvaras
  for insert with check (auth.role() = 'authenticated');
create policy alvaras_update on alvaras
  for update using (auth.role() = 'authenticated');
create policy alvaras_delete_admin on alvaras
  for delete using (is_admin());

create policy alvara_history_select on alvara_history
  for select using (auth.role() = 'authenticated');
create policy alvara_history_insert on alvara_history
  for insert with check (auth.role() = 'authenticated');

create policy alvara_imports_select on alvara_imports
  for select using (auth.role() = 'authenticated');
create policy alvara_imports_insert on alvara_imports
  for insert with check (auth.role() = 'authenticated');
create policy alvara_imports_update on alvara_imports
  for update using (auth.role() = 'authenticated');

create policy alvara_import_rows_select on alvara_import_rows
  for select using (auth.role() = 'authenticated');
create policy alvara_import_rows_insert on alvara_import_rows
  for insert with check (auth.role() = 'authenticated');
