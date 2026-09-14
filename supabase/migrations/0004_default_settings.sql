-- ============================================================================
-- 0004_default_settings.sql
-- Seeds the settings table with the default, working configuration.
-- This is NOT sample/demo data -- it's required application configuration.
-- ============================================================================

insert into settings (key, value)
values
  ('certificate_thresholds', jsonb_build_object(
    'warning_days', 30,
    'alert_days', jsonb_build_array(60, 30, 15, 7, 1)
  ))
on conflict (key) do nothing;
