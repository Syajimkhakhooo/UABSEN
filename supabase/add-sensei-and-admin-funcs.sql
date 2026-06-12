-- 1. Tambahkan Role 'sensei'
do $$
begin
  if not exists (
    select 1 from pg_enum 
    where enumtypid = 'public.user_role'::regtype 
    and enumlabel = 'sensei'
  ) then
    alter type public.user_role add value 'sensei';
  end if;
end $$;

-- 2. Fungsi Reset Password oleh Admin
create or replace function public.admin_reset_student_password(
  target_student_id uuid,
  new_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_auth_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat mereset password.';
  end if;

  select auth_user_id into target_auth_user_id
  from public.profiles
  where student_id = target_student_id and role = 'student' and active = true
  limit 1;

  if target_auth_user_id is null then
    raise exception 'Siswa belum memiliki akun login tertaut.';
  end if;

  update auth.users
  set encrypted_password = crypt(new_password, gen_salt('bf'))
  where id = target_auth_user_id;

  return true;
end;
$$;

-- 3. Fungsi Melihat Email Siswa
create or replace function public.admin_get_student_emails()
returns table (
  student_id uuid,
  email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat melihat email siswa.';
  end if;

  return query
  select p.student_id, u.email::text
  from public.profiles p
  join auth.users u on u.id = p.auth_user_id
  where p.role = 'student';
end;
$$;
