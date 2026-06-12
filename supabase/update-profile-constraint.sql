alter table public.profiles drop constraint if exists student_profile_role_check;

alter table public.profiles add constraint student_profile_role_check check (
  (role in ('admin', 'sensei') and student_id is null) or
  (role = 'student') or
  (role is null and student_id is null)
);

create or replace function public.admin_get_staff_profiles()
returns table (
  id uuid,
  auth_user_id uuid,
  email text,
  role public.user_role,
  active boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat melihat data staf.';
  end if;

  return query
  select p.id, p.auth_user_id, u.email::text, p.role, p.active
  from public.profiles p
  join auth.users u on u.id = p.auth_user_id
  where p.role in ('admin', 'sensei');
end;
$$;

create or replace function public.admin_delete_user(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat menghapus data staf.';
  end if;

  delete from auth.users where id = target_user_id;
  return true;
end;
$$;
