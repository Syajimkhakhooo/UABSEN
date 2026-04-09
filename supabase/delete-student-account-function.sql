create or replace function public.delete_student_and_account(target_student_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  linked_auth_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat menghapus siswa.';
  end if;

  if target_student_id is null then
    raise exception 'ID siswa wajib diisi.';
  end if;

  select profiles.auth_user_id
  into linked_auth_user_id
  from public.profiles
  where profiles.student_id = target_student_id
    and profiles.role = 'student'
  limit 1;

  delete from public.students
  where id = target_student_id;

  if not found then
    raise exception 'Data siswa tidak ditemukan.';
  end if;

  if linked_auth_user_id is not null then
    delete from auth.users
    where id = linked_auth_user_id;
  end if;

  insert into public.audit_logs (actor_auth_user_id, action, description, metadata)
  values (
    auth.uid(),
    'student_delete',
    'Admin menghapus data siswa beserta akun login yang tertaut.',
    jsonb_build_object(
      'student_id', target_student_id,
      'deleted_auth_user_id', linked_auth_user_id
    )
  );

  return true;
end;
$$;
