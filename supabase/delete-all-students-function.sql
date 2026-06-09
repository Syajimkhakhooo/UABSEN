create or replace function public.delete_all_students_and_accounts()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  auth_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat menghapus siswa.';
  end if;

  -- 1. Loop dan hapus semua user di auth.users yang terkait dengan profil ber-role 'student'
  for auth_id in 
    select auth_user_id from public.profiles where role = 'student' and auth_user_id is not null
  loop
    delete from auth.users where id = auth_id;
  end loop;

  -- 2. Hapus semua baris di tabel public.students (menggunakan where untuk melewati pg_safeupdate)
  delete from public.students where id is not null;

  -- 3. Catat ke audit log
  insert into public.audit_logs (actor_auth_user_id, action, description, metadata)
  values (
    auth.uid(),
    'student_delete_all',
    'Admin menghapus SELURUH data siswa beserta akun login yang tertaut.',
    '{}'::jsonb
  );

  return true;
end;
$$;
