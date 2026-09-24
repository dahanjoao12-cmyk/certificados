-- ============================================================================
-- 0009_clients_extra_fields.sql
-- Additive fields for the "Cliente" cadastro, matching the reference system's
-- fields not already covered by the existing schema (municipality/uf already
-- cover Cidade/Estado -- not duplicated here).
--
-- `responsible` (free text) is kept as-is: real client rows already have
-- values like "Amanda"/"Paulo" there, and there is no reliable way to auto-map
-- that to a real profiles.id. New writes go to responsible_user_id; reads
-- fall back to the old text field when it's null (see getResponsibleLabel in
-- the application layer).
-- ============================================================================

alter table companies
  add column if not exists state_registration text,
  add column if not exists municipal_tax_registration text,
  add column if not exists whatsapp text,
  add column if not exists zip_code text,
  add column if not exists address_street text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists neighborhood text,
  add column if not exists responsible_user_id uuid references profiles(id);

create index if not exists companies_responsible_user_id_idx on companies (responsible_user_id);
