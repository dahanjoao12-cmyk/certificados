-- ============================================================================
-- 0003_rls_policies.sql
-- Row Level Security. This app is 100% internal/private: every table requires
-- an authenticated session. Within that, only a few actions are admin-only
-- (deleting records, managing settings, managing users).
-- ============================================================================

alter table profiles enable row level security;
alter table companies enable row level security;
alter table certificates enable row level security;
alter table certificate_history enable row level security;
alter table imports enable row level security;
alter table import_rows enable row level security;
alter table audit_logs enable row level security;
alter table report_presets enable row level security;
alter table settings enable row level security;
alter table user_table_preferences enable row level security;

-- profiles -------------------------------------------------------------------
create policy profiles_select on profiles
  for select using (auth.role() = 'authenticated');

create policy profiles_update_self on profiles
  for update using (auth.uid() = id or is_admin());

create policy profiles_insert_admin on profiles
  for insert with check (is_admin() or auth.uid() = id);

create policy profiles_delete_admin on profiles
  for delete using (is_admin());

-- companies --------------------------------------------------------------
create policy companies_select on companies
  for select using (auth.role() = 'authenticated');

create policy companies_insert on companies
  for insert with check (auth.role() = 'authenticated');

create policy companies_update on companies
  for update using (auth.role() = 'authenticated');

create policy companies_delete_admin on companies
  for delete using (is_admin());

-- certificates -------------------------------------------------------------
create policy certificates_select on certificates
  for select using (auth.role() = 'authenticated');

create policy certificates_insert on certificates
  for insert with check (auth.role() = 'authenticated');

create policy certificates_update on certificates
  for update using (auth.role() = 'authenticated');

create policy certificates_delete_admin on certificates
  for delete using (is_admin());

-- certificate_history (append-only; never edited or deleted from the app) --
create policy certificate_history_select on certificate_history
  for select using (auth.role() = 'authenticated');

create policy certificate_history_insert on certificate_history
  for insert with check (auth.role() = 'authenticated');

-- imports / import_rows -----------------------------------------------------
create policy imports_select on imports
  for select using (auth.role() = 'authenticated');

create policy imports_insert on imports
  for insert with check (auth.role() = 'authenticated');

create policy imports_update on imports
  for update using (auth.role() = 'authenticated');

create policy import_rows_select on import_rows
  for select using (auth.role() = 'authenticated');

create policy import_rows_insert on import_rows
  for insert with check (auth.role() = 'authenticated');

-- audit_logs (immutable log: insert + select only, never update/delete) ----
create policy audit_logs_select on audit_logs
  for select using (auth.role() = 'authenticated');

create policy audit_logs_insert on audit_logs
  for insert with check (auth.role() = 'authenticated');

-- report_presets -------------------------------------------------------------
create policy report_presets_select on report_presets
  for select using (auth.role() = 'authenticated');

create policy report_presets_insert on report_presets
  for insert with check (auth.role() = 'authenticated');

create policy report_presets_update on report_presets
  for update using (created_by = auth.uid() or is_admin());

create policy report_presets_delete on report_presets
  for delete using (created_by = auth.uid() or is_admin());

-- settings (admin-only writes; everyone can read the active configuration) --
create policy settings_select on settings
  for select using (auth.role() = 'authenticated');

create policy settings_insert_admin on settings
  for insert with check (is_admin());

create policy settings_update_admin on settings
  for update using (is_admin());

-- user_table_preferences (private per user) ---------------------------------
create policy user_table_preferences_select on user_table_preferences
  for select using (user_id = auth.uid());

create policy user_table_preferences_insert on user_table_preferences
  for insert with check (user_id = auth.uid());

create policy user_table_preferences_update on user_table_preferences
  for update using (user_id = auth.uid());

create policy user_table_preferences_delete on user_table_preferences
  for delete using (user_id = auth.uid());
