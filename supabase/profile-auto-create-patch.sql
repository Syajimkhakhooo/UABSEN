create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role' and typnamespace = 'public'::regnamespace) then
    create type public.user_role as enum ('admin', 'student');
  end if;
end $$;

alter table if exists public.profiles
  alter column role drop not null;

alter table if exists public.profiles
  drop constraint if exists student_profile_role_check;

alter table if exists public.profiles
  add constraint student_profile_role_check
  check (
    (role = 'admin' and student_id is null) or
    (role = 'student') or
    (role is null and student_id is null)
  );

create unique index if not exists profiles_student_id_unique
  on public.profiles (student_id)
  where role = 'student' and student_id is not null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (auth_user_id, active)
  values (new.id, true)
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into public.profiles (auth_user_id, active)
select auth_users.id, true
from auth.users auth_users
where not exists (
  select 1
  from public.profiles profiles
  where profiles.auth_user_id = auth_users.id
)
on conflict (auth_user_id) do nothing;
