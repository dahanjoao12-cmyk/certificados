-- ============================================================================
-- 0006_profile_on_signup.sql
-- Auto-creates a `profiles` row whenever a user is created in auth.users
-- (e.g. via the admin "create user" flow), reading full_name/role from the
-- user's metadata so the admin API can set them at creation time.
-- ============================================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    case
      when new.raw_user_meta_data ->> 'role' in ('admin', 'user') then new.raw_user_meta_data ->> 'role'
      else 'user'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
