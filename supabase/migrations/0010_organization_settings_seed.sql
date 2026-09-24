-- ============================================================================
-- 0010_organization_settings_seed.sql
-- "Minha Organização" reuses the existing settings k/v table (same pattern as
-- certificate_thresholds) -- no new table needed, just a documented default
-- row so the key always exists.
-- ============================================================================

insert into settings (key, value)
values (
  'organization_info',
  jsonb_build_object(
    'cnpj', null,
    'corporate_name', null,
    'trade_name', null,
    'zip_code', null,
    'address_street', null,
    'address_number', null,
    'address_complement', null,
    'neighborhood', null,
    'city', null,
    'uf', null
  )
)
on conflict (key) do nothing;
