-- ============================================================================
-- 0005_report_views.sql
-- Read-only views backing a few report-builder shortcuts that don't fit the
-- generic filter system (section 33): companies with no certificate at all,
-- and companies with more than one certificate on file.
-- ============================================================================

create or replace view companies_without_certificate
with (security_invoker = true)
as
select c.*
from companies c
where not exists (
  select 1 from certificates cert where cert.company_id = c.id
);

create or replace view companies_certificate_counts
with (security_invoker = true)
as
select
  c.id as company_id,
  c.code,
  c.document,
  c.document_type,
  c.corporate_name,
  c.short_name,
  c.municipality,
  c.uf,
  count(cert.id) as certificate_count
from companies c
join certificates cert on cert.company_id = c.id
group by c.id;
