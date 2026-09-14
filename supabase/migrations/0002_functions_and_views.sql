-- ============================================================================
-- 0002_functions_and_views.sql
-- Centralized certificate status calculation + helper views.
--
-- IMPORTANT: this is the SINGLE source of truth for certificate status.
-- The TypeScript layer (src/lib/certificates/status.ts) mirrors this logic
-- for optimistic UI, but any filtering/reporting query must use this view
-- or these functions so the rule never drifts.
-- ============================================================================

-- Warning threshold, read from settings.certificate_thresholds.warning_days.
-- Defaults to 30 when not configured yet.
create or replace function get_certificate_warning_days()
returns int
language sql
stable
as $$
  select coalesce(
    (select (value ->> 'warning_days')::int from settings where key = 'certificate_thresholds'),
    30
  );
$$;

create or replace function certificate_status(p_valid_to date, p_archived boolean)
returns text
language sql
stable
as $$
  select case
    when p_archived then 'ARQUIVADO'
    when p_valid_to < current_date then 'VENCIDO'
    when p_valid_to = current_date then 'VENCE_HOJE'
    when p_valid_to <= current_date + get_certificate_warning_days() then 'VENCENDO'
    else 'EM_DIA'
  end;
$$;

-- Numeric ordering so "needs attention first" is a plain ORDER BY, not
-- scattered CASE expressions in every query that lists certificates.
create or replace function certificate_status_priority(p_status text)
returns int
language sql
immutable
as $$
  select case p_status
    when 'VENCIDO' then 0
    when 'VENCE_HOJE' then 1
    when 'VENCENDO' then 2
    when 'EM_DIA' then 3
    when 'ARQUIVADO' then 4
    else 5
  end;
$$;

-- Convenience view joining company data, used by the dashboard, company page
-- and report builder. Read-only.
create or replace view certificates_view as
select
  c.id,
  c.company_id,
  c.type,
  c.model,
  c.serial_number,
  c.subject,
  c.issuer,
  c.certificate_authority,
  c.valid_from,
  c.valid_to,
  c.fingerprint,
  c.algorithm,
  c.archived,
  c.is_current,
  c.origin,
  c.notes,
  c.metadata,
  c.created_at,
  c.updated_at,
  c.processed_at,
  c.created_by,
  certificate_status(c.valid_to, c.archived) as status,
  certificate_status_priority(certificate_status(c.valid_to, c.archived)) as status_priority,
  (c.valid_to - current_date) as days_remaining,
  co.code as company_code,
  co.document as company_document,
  co.document_type as company_document_type,
  co.corporate_name as company_corporate_name,
  co.trade_name as company_trade_name,
  co.short_name as company_short_name,
  co.municipality as company_municipality,
  co.uf as company_uf,
  co.responsible as company_responsible,
  co.active as company_active
from certificates c
join companies co on co.id = c.company_id;

-- Helper used by RLS policies to check the caller's role without recursion.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from profiles where id = auth.uid()) = 'admin', false);
$$;

-- Keeps updated_at fresh on every update, for tables that track it.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();

drop trigger if exists companies_set_updated_at on companies;
create trigger companies_set_updated_at before update on companies
  for each row execute function set_updated_at();

drop trigger if exists certificates_set_updated_at on certificates;
create trigger certificates_set_updated_at before update on certificates
  for each row execute function set_updated_at();

drop trigger if exists report_presets_set_updated_at on report_presets;
create trigger report_presets_set_updated_at before update on report_presets
  for each row execute function set_updated_at();

-- Guarantees only one "current" certificate per company at the DB level,
-- regardless of which code path inserted/updated the row. This is what lets
-- renewals keep full history: the old certificate is simply demoted, never
-- deleted or overwritten.
create or replace function enforce_single_current_certificate()
returns trigger
language plpgsql
as $$
begin
  if new.is_current then
    update certificates
      set is_current = false
      where company_id = new.company_id
        and id <> new.id
        and is_current = true;
  end if;
  return new;
end;
$$;

drop trigger if exists certificates_enforce_single_current on certificates;
create trigger certificates_enforce_single_current
  after insert or update of is_current on certificates
  for each row when (new.is_current)
  execute function enforce_single_current_certificate();
