-- ============================================================================
-- 0008_notification_reads_update_policy.sql
-- notification_reads was missing an UPDATE policy (0007 only added
-- select/insert/delete). markNotificationRead/markAllNotificationsRead use
-- `.upsert(..., { onConflict: "certificate_id,user_id" })`, which PostgREST
-- turns into `INSERT ... ON CONFLICT (...) DO UPDATE` -- the ON CONFLICT
-- branch needs UPDATE privileges (RLS-checked like any other command), not
-- just INSERT. Without this policy, re-marking an already-read notification
-- (e.g. a double-click, or two tabs open) silently fails.
-- ============================================================================

create policy notification_reads_update on notification_reads
  for update using (user_id = auth.uid());
