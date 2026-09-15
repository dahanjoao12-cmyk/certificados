-- ============================================================================
-- 0001_extensions_and_tables.sql
-- Base schema: extensions and core tables for the certificate management app.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";

-- ----------------------------------------------------------------------------
-- profiles: one row per authenticated user (mirrors auth.users)
-- ----------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- companies: the client/company entity. Certificates hang off this table.
-- ----------------------------------------------------------------------------
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  document text not null,
  document_type text not null check (document_type in ('cnpj', 'cpf')),
  corporate_name text not null,
  trade_name text,
  short_name text,
  municipality text,
  uf text check (uf is null or char_length(uf) = 2),
  situation text,
  responsible text,
  phone text,
  email text,
  notes text,
  origin text not null default 'manual' check (origin in ('manual', 'import')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id),
  constraint companies_code_unique unique (code),
  constraint companies_document_unique unique (document)
);

create index if not exists companies_document_idx on companies (document);
create index if not exists companies_code_idx on companies (code);
create index if not exists companies_municipality_idx on companies (municipality);
create index if not exists companies_uf_idx on companies (uf);
create index if not exists companies_active_idx on companies (active);
create index if not exists companies_corporate_name_trgm_idx on companies using gin (corporate_name gin_trgm_ops);
create index if not exists companies_trade_name_trgm_idx on companies using gin (trade_name gin_trgm_ops);
create index if not exists companies_short_name_trgm_idx on companies using gin (short_name gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- certificates: one company can have many certificates over time (history).
-- ----------------------------------------------------------------------------
create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  type text not null check (type in ('e-cnpj', 'e-cpf')),
  model text not null check (model in ('A1', 'A3')),
  valid_from date,
  valid_to date not null,
  -- Per-certificate override of settings.certificate_thresholds.warning_days
  -- (section: "avisar quando estiver vencendo em ___ dias"). Null falls back
  -- to the global default -- see get_certificate_warning_days().
  warning_days int check (warning_days is null or warning_days > 0),
  archived boolean not null default false,
  is_current boolean not null default true,
  origin text not null default 'manual' check (origin in ('manual', 'import')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);

create index if not exists certificates_company_id_idx on certificates (company_id);
create index if not exists certificates_valid_to_idx on certificates (valid_to);
create index if not exists certificates_archived_idx on certificates (archived);
create index if not exists certificates_is_current_idx on certificates (is_current);

-- ----------------------------------------------------------------------------
-- certificate_history: audit trail of what changed on a certificate/company
-- ----------------------------------------------------------------------------
create table if not exists certificate_history (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid references certificates(id) on delete set null,
  company_id uuid not null references companies(id) on delete cascade,
  action text not null check (action in ('created', 'renewed', 'updated', 'archived', 'restored', 'deleted')),
  field_changed text,
  old_value text,
  new_value text,
  changed_by uuid references profiles(id),
  changed_at timestamptz not null default now()
);

create index if not exists certificate_history_company_id_idx on certificate_history (company_id);
create index if not exists certificate_history_certificate_id_idx on certificate_history (certificate_id);
create index if not exists certificate_history_changed_at_idx on certificate_history (changed_at desc);

-- ----------------------------------------------------------------------------
-- imports: one row per spreadsheet import run
-- ----------------------------------------------------------------------------
create table if not exists imports (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  import_type text not null check (import_type in ('companies', 'certificates', 'combined')),
  mapping jsonb not null default '{}'::jsonb,
  total_rows int not null default 0,
  companies_created int not null default 0,
  companies_updated int not null default 0,
  certificates_created int not null default 0,
  duplicates int not null default 0,
  conflicts int not null default 0,
  errors int not null default 0,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  imported_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists imports_created_at_idx on imports (created_at desc);

-- ----------------------------------------------------------------------------
-- import_rows: per-row outcome of an import, for the detailed report/log
-- ----------------------------------------------------------------------------
create table if not exists import_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references imports(id) on delete cascade,
  row_number int not null,
  raw_data jsonb not null,
  result text not null check (result in ('company_created', 'company_updated', 'certificate_created', 'duplicate', 'conflict', 'error', 'skipped')),
  message text,
  company_id uuid references companies(id),
  certificate_id uuid references certificates(id)
);

create index if not exists import_rows_import_id_idx on import_rows (import_id);
create index if not exists import_rows_result_idx on import_rows (result);

-- ----------------------------------------------------------------------------
-- audit_logs: general activity log (who did what)
-- ----------------------------------------------------------------------------
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on audit_logs (created_at desc);
create index if not exists audit_logs_entity_idx on audit_logs (entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- report_presets: saved custom report definitions
-- ----------------------------------------------------------------------------
create table if not exists report_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base text not null check (base in ('companies', 'certificates', 'combined')),
  filters jsonb not null default '{}'::jsonb,
  columns jsonb not null default '[]'::jsonb,
  order_by jsonb not null default '{}'::jsonb,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- settings: single key/value store for system-wide configuration
-- ----------------------------------------------------------------------------
create table if not exists settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);

-- ----------------------------------------------------------------------------
-- user_table_preferences: per-user column visibility/order per table
-- ----------------------------------------------------------------------------
create table if not exists user_table_preferences (
  user_id uuid not null references profiles(id) on delete cascade,
  table_key text not null,
  columns jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, table_key)
);
