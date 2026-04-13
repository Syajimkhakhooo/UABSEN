create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role' and typnamespace = 'public'::regnamespace) then
    create type public.user_role as enum ('admin', 'student');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'attendance_status' and typnamespace = 'public'::regnamespace) then
    create type public.attendance_status as enum ('present', 'late', 'leave', 'sick', 'absent', 'corrected');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'leave_request_type' and typnamespace = 'public'::regnamespace) then
    create type public.leave_request_type as enum ('leave', 'sick');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'review_status' and typnamespace = 'public'::regnamespace) then
    create type public.review_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_number text not null unique,
  name text not null,
  phone text,
  address text,
  training_program text,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  student_id uuid unique references public.students(id) on delete set null,
  role public.user_role,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint student_profile_role_check check (
    (role = 'admin' and student_id is null) or
    (role = 'student') or
    (role is null and student_id is null)
  )
);

create table if not exists public.attendance_points (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters integer not null check (radius_meters > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attendance_settings (
  id uuid primary key default gen_random_uuid(),
  check_in_start time not null,
  present_cutoff time not null,
  late_cutoff time not null,
  check_in_end time not null,
  check_out_start time not null,
  check_out_end time not null,
  gps_accuracy_threshold integer,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.attendances (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  attendance_date date not null,
  attendance_status public.attendance_status not null default 'absent',
  check_in_at timestamptz,
  check_out_at timestamptz,
  check_in_latitude double precision,
  check_in_longitude double precision,
  check_in_accuracy double precision,
  check_out_latitude double precision,
  check_out_longitude double precision,
  check_out_accuracy double precision,
  correction_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (student_id, attendance_date)
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  request_type public.leave_request_type not null,
  start_date date not null,
  end_date date not null,
  reason text not null,
  review_status public.review_status not null default 'pending',
  review_note text,
  reviewed_by_auth_user_id uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint leave_date_range_check check (end_date >= start_date)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_auth_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  event_type text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_by_auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_auth_user_id_idx on public.profiles (auth_user_id);
create index if not exists profiles_student_id_idx on public.profiles (student_id);
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists attendances_student_date_idx on public.attendances (student_id, attendance_date desc);
create index if not exists leave_requests_student_idx on public.leave_requests (student_id, created_at desc);
create index if not exists notifications_recipient_idx on public.notifications (recipient_auth_user_id, is_read, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action, created_at desc);

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
set search_path = public, auth
as $$
begin
  insert into public.profiles (auth_user_id, active)
  values (new.id, true)
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

create or replace function public.sync_profile_student()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  auth_name text;
  generated_student_number text;
begin
  if new.role is distinct from 'student'::public.user_role then
    new.student_id = null;
    return new;
  end if;

  if new.student_id is null then
    select coalesce(
      raw_user_meta_data->>'full_name',
      raw_user_meta_data->>'name',
      split_part(email, '@', 1),
      'Siswa Baru'
    )
    into auth_name
    from auth.users
    where id = new.auth_user_id;

    generated_student_number := 'AUTO-' || upper(substring(replace(new.auth_user_id::text, '-', '') from 1 for 12));

    insert into public.students (
      student_number,
      name,
      active
    )
    values (
      generated_student_number,
      coalesce(auth_name, 'Siswa Baru'),
      coalesce(new.active, true)
    )
    returning id into new.student_id;
  else
    update public.students
    set
      active = coalesce(new.active, active),
      updated_at = timezone('utc', now())
    where id = new.student_id;
  end if;

  return new;
end;
$$;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid();
$$;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where auth_user_id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role = 'admin' and active = true
      from public.profiles
      where auth_user_id = auth.uid()
    ),
    false
  );
$$;

create or replace function public.current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select profiles.student_id
  from public.profiles
  join public.students on students.id = profiles.student_id
  where profiles.auth_user_id = auth.uid()
    and profiles.role = 'student'
    and profiles.active = true
    and students.active = true;
$$;

create or replace function public.student_auth_user_id(target_student_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select auth_user_id
  from public.profiles
  where student_id = target_student_id and role = 'student' and active = true
  limit 1;
$$;

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

create or replace function public.haversine_distance_meters(
  lat1 double precision,
  lon1 double precision,
  lat2 double precision,
  lon2 double precision
)
returns double precision
language sql
immutable
as $$
  select 6371000 * 2 * asin(
    sqrt(
      pow(sin(radians((lat2 - lat1) / 2)), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) * pow(sin(radians((lon2 - lon1) / 2)), 2)
    )
  );
$$;

create or replace function public.apply_leave_to_attendance(
  target_student_id uuid,
  target_type public.leave_request_type,
  target_start date,
  target_end date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.attendances (student_id, attendance_date, attendance_status)
  select
    target_student_id,
    generated_date::date,
    case when target_type = 'leave' then 'leave'::public.attendance_status else 'sick'::public.attendance_status end
  from generate_series(target_start, target_end, interval '1 day') as generated_date
  on conflict (student_id, attendance_date)
  do update set
    attendance_status = excluded.attendance_status,
    updated_at = timezone('utc', now())
  where public.attendances.check_in_at is null;
end;
$$;

create or replace function public.ensure_daily_absences(
  target_date_input date default null,
  force_generate boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_settings public.attendance_settings;
  effective_date date := coalesce(target_date_input, (timezone('Asia/Jakarta', now()))::date);
  local_now time := (timezone('Asia/Jakarta', now()))::time;
  inserted_count integer := 0;
begin
  select *
  into target_settings
  from public.attendance_settings
  order by updated_at desc
  limit 1;

  if target_settings.id is null then
    return 0;
  end if;

  if not force_generate and target_date_input is null and local_now < target_settings.check_in_end then
    return 0;
  end if;

  insert into public.attendances (student_id, attendance_date, attendance_status)
  select
    students.id,
    effective_date,
    'absent'::public.attendance_status
  from public.students
  where students.active = true
    and not exists (
      select 1
      from public.attendances
      where attendances.student_id = students.id
        and attendances.attendance_date = effective_date
    )
  on conflict (student_id, attendance_date) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.submit_leave_request(
  request_type_input text,
  start_date_input date,
  end_date_input date,
  reason_input text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_student_id uuid;
  target_request_type public.leave_request_type;
  inserted_row public.leave_requests;
begin
  target_student_id := public.current_student_id();

  if target_student_id is null then
    raise exception 'Akun ini belum terhubung ke data siswa aktif.';
  end if;

  if request_type_input is null or request_type_input not in ('leave', 'sick') then
    raise exception 'Jenis pengajuan tidak valid.';
  end if;

  if start_date_input is null or end_date_input is null then
    raise exception 'Tanggal mulai dan tanggal selesai wajib diisi.';
  end if;

  if end_date_input < start_date_input then
    raise exception 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.';
  end if;

  if reason_input is null or btrim(reason_input) = '' then
    raise exception 'Alasan pengajuan wajib diisi.';
  end if;

  target_request_type := request_type_input::public.leave_request_type;

  insert into public.leave_requests (
    student_id,
    request_type,
    start_date,
    end_date,
    reason
  )
  values (
    target_student_id,
    target_request_type,
    start_date_input,
    end_date_input,
    btrim(reason_input)
  )
  returning * into inserted_row;

  return jsonb_build_object(
    'id', inserted_row.id,
    'student_id', inserted_row.student_id,
    'request_type', inserted_row.request_type,
    'start_date', inserted_row.start_date,
    'end_date', inserted_row.end_date,
    'reason', inserted_row.reason,
    'review_status', inserted_row.review_status,
    'review_note', inserted_row.review_note,
    'created_at', inserted_row.created_at,
    'updated_at', inserted_row.updated_at
  );
end;
$$;

create or replace function public.perform_attendance_action(
  action_name text,
  input_latitude double precision,
  input_longitude double precision,
  input_accuracy double precision default null
)
returns public.attendances
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.profiles;
  target_student public.students;
  target_point public.attendance_points;
  target_settings public.attendance_settings;
  existing_attendance public.attendances;
  today_date date := (timezone('Asia/Jakarta', now()))::date;
  local_now time := (timezone('Asia/Jakarta', now()))::time;
  computed_distance double precision;
  resulting_status public.attendance_status;
  affected_row public.attendances;
begin
  select * into target_profile
  from public.profiles
  where auth_user_id = auth.uid() and role = 'student' and active = true;

  if target_profile.id is null then
    raise exception 'Hanya akun student aktif yang dapat melakukan absensi.';
  end if;

  select * into target_student
  from public.students
  where id = target_profile.student_id and active = true;

  if target_student.id is null then
    raise exception 'Akun ini belum ditautkan ke data siswa aktif.';
  end if;

  select * into target_point
  from public.attendance_points
  where is_active = true
  order by updated_at desc
  limit 1;

  select * into target_settings
  from public.attendance_settings
  order by updated_at desc
  limit 1;

  if target_point.id is null or target_settings.id is null then
    raise exception 'Pengaturan absensi belum lengkap.';
  end if;

  select * into existing_attendance
  from public.attendances
  where student_id = target_student.id
    and attendance_date = today_date
  limit 1;

  if existing_attendance.id is not null
     and existing_attendance.attendance_status in ('leave', 'sick') then
    raise exception 'Absensi hari ini sudah ditandai sebagai izin/sakit.';
  end if;

  if target_settings.gps_accuracy_threshold is not null
     and input_accuracy is not null
     and input_accuracy > target_settings.gps_accuracy_threshold then
    raise exception 'Akurasi GPS melebihi ambang batas.';
  end if;

  computed_distance := public.haversine_distance_meters(
    input_latitude,
    input_longitude,
    target_point.latitude,
    target_point.longitude
  );

  if computed_distance > target_point.radius_meters then
    insert into public.audit_logs (action, description, metadata)
    values (
      'attendance_reject_radius',
      'Absensi ditolak karena berada di luar radius lokasi.',
      jsonb_build_object('distance_meters', computed_distance, 'radius_meters', target_point.radius_meters)
    );
    raise exception 'Anda berada di luar radius absensi.';
  end if;

  if action_name = 'check_in' then
    if existing_attendance.check_in_at is not null then
      raise exception 'Check-in hari ini sudah tercatat.';
    end if;

    if local_now < target_settings.check_in_start or local_now > target_settings.check_in_end then
      insert into public.audit_logs (action, description, metadata)
      values ('attendance_reject_time', 'Check-in ditolak karena di luar waktu absensi.', jsonb_build_object('time', local_now));
      raise exception 'Waktu check-in tidak valid.';
    end if;

    resulting_status := case when local_now <= target_settings.present_cutoff then 'present' else 'late' end;

    insert into public.attendances (
      student_id,
      attendance_date,
      attendance_status,
      check_in_at,
      check_in_latitude,
      check_in_longitude,
      check_in_accuracy
    )
    values (
      target_student.id,
      today_date,
      resulting_status,
      timezone('utc', now()),
      input_latitude,
      input_longitude,
      input_accuracy
    )
    on conflict (student_id, attendance_date)
    do update set
      attendance_status = excluded.attendance_status,
      check_in_at = excluded.check_in_at,
      check_in_latitude = excluded.check_in_latitude,
      check_in_longitude = excluded.check_in_longitude,
      check_in_accuracy = excluded.check_in_accuracy,
      updated_at = timezone('utc', now())
    returning * into affected_row;

    insert into public.notifications (recipient_auth_user_id, title, message, event_type)
    values (auth.uid(), 'Check-in berhasil', 'Check-in Anda berhasil dicatat oleh sistem.', 'attendance_success');

    insert into public.audit_logs (action, description, metadata)
    values ('attendance_check_in', 'Siswa melakukan check-in.', jsonb_build_object('student_id', target_student.id, 'status', resulting_status));

    return affected_row;
  elsif action_name = 'check_out' then
    if existing_attendance.check_out_at is not null then
      raise exception 'Check-out hari ini sudah tercatat.';
    end if;

    if local_now < target_settings.check_out_start or local_now > target_settings.check_out_end then
      insert into public.audit_logs (action, description, metadata)
      values ('attendance_reject_time', 'Check-out ditolak karena di luar waktu absensi.', jsonb_build_object('time', local_now));
      raise exception 'Waktu check-out tidak valid.';
    end if;

    update public.attendances
    set
      check_out_at = timezone('utc', now()),
      check_out_latitude = input_latitude,
      check_out_longitude = input_longitude,
      check_out_accuracy = input_accuracy,
      updated_at = timezone('utc', now())
    where student_id = target_student.id and attendance_date = today_date
    returning * into affected_row;

    if affected_row.id is null then
      raise exception 'Check-in belum ditemukan untuk hari ini.';
    end if;

    insert into public.notifications (recipient_auth_user_id, title, message, event_type)
    values (auth.uid(), 'Check-out berhasil', 'Check-out Anda berhasil dicatat oleh sistem.', 'attendance_success');

    insert into public.audit_logs (action, description, metadata)
    values ('attendance_check_out', 'Siswa melakukan check-out.', jsonb_build_object('student_id', target_student.id));

    return affected_row;
  else
    raise exception 'Aksi absensi tidak dikenal.';
  end if;
end;
$$;

create or replace function public.review_leave_request(
  leave_request_id_input uuid,
  review_status_input public.review_status,
  review_note_input text default null
)
returns public.leave_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  target_request public.leave_requests;
  target_student public.students;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat memproses pengajuan.';
  end if;

  update public.leave_requests
  set
    review_status = review_status_input,
    review_note = review_note_input,
    reviewed_by_auth_user_id = auth.uid(),
    reviewed_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  where id = leave_request_id_input
  returning * into target_request;

  if target_request.id is null then
    raise exception 'Pengajuan tidak ditemukan.';
  end if;

  if review_status_input = 'approved' then
    perform public.apply_leave_to_attendance(
      target_request.student_id,
      target_request.request_type,
      target_request.start_date,
      target_request.end_date
    );
  end if;

  select * into target_student from public.students where id = target_request.student_id;

  if public.student_auth_user_id(target_student.id) is not null then
    insert into public.notifications (recipient_auth_user_id, title, message, event_type)
    values (
      public.student_auth_user_id(target_student.id),
      case when review_status_input = 'approved' then 'Pengajuan disetujui' else 'Pengajuan ditolak' end,
      case when review_status_input = 'approved'
        then 'Pengajuan izin/sakit Anda telah disetujui admin.'
        else 'Pengajuan izin/sakit Anda ditolak admin.'
      end,
      case when review_status_input = 'approved' then 'leave_approved' else 'leave_rejected' end
    );
  end if;

  return target_request;
end;
$$;

create or replace function public.manual_correct_attendance(
  attendance_id_input uuid,
  new_status public.attendance_status,
  new_check_in_at timestamptz default null,
  new_check_out_at timestamptz default null,
  correction_note_input text default null
)
returns public.attendances
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_row public.attendances;
  target_student public.students;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat melakukan koreksi.';
  end if;

  update public.attendances
  set
    attendance_status = new_status,
    check_in_at = coalesce(new_check_in_at, check_in_at),
    check_out_at = coalesce(new_check_out_at, check_out_at),
    correction_note = correction_note_input,
    updated_at = timezone('utc', now())
  where id = attendance_id_input
  returning * into affected_row;

  if affected_row.id is null then
    raise exception 'Record absensi tidak ditemukan.';
  end if;

  select * into target_student from public.students where id = affected_row.student_id;

  if public.student_auth_user_id(target_student.id) is not null then
    insert into public.notifications (recipient_auth_user_id, title, message, event_type)
    values (
      public.student_auth_user_id(target_student.id),
      'Absensi dikoreksi',
      'Admin melakukan koreksi pada catatan absensi Anda.',
      'attendance_corrected'
    );
  end if;

  insert into public.audit_logs (action, description, metadata)
  values ('attendance_manual_correction', 'Admin melakukan koreksi absensi manual.', jsonb_build_object('attendance_id', affected_row.id, 'new_status', new_status));

  return affected_row;
end;
$$;

create or replace function public.broadcast_notification(
  notification_title text,
  notification_message text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang dapat mengirim broadcast.';
  end if;

  insert into public.notifications (recipient_auth_user_id, title, message, event_type, created_by_auth_user_id)
  select
    profiles.auth_user_id,
    notification_title,
    notification_message,
    'admin_announcement',
    auth.uid()
  from public.students
  join public.profiles
    on profiles.student_id = students.id
  where profiles.role = 'student'
    and profiles.active = true
    and students.active = true;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.set_notification_created_by()
returns trigger
language plpgsql
as $$
begin
  if new.created_by_auth_user_id is null then
    new.created_by_auth_user_id = auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.set_audit_actor()
returns trigger
language plpgsql
as $$
begin
  if new.actor_auth_user_id is null then
    new.actor_auth_user_id = auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists profiles_sync_student on public.profiles;
create trigger profiles_sync_student before insert or update on public.profiles for each row execute function public.sync_profile_student();
drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at before update on public.students for each row execute function public.set_updated_at();
drop trigger if exists attendance_points_set_updated_at on public.attendance_points;
create trigger attendance_points_set_updated_at before update on public.attendance_points for each row execute function public.set_updated_at();
drop trigger if exists attendance_settings_set_updated_at on public.attendance_settings;
create trigger attendance_settings_set_updated_at before update on public.attendance_settings for each row execute function public.set_updated_at();
drop trigger if exists attendances_set_updated_at on public.attendances;
create trigger attendances_set_updated_at before update on public.attendances for each row execute function public.set_updated_at();
drop trigger if exists leave_requests_set_updated_at on public.leave_requests;
create trigger leave_requests_set_updated_at before update on public.leave_requests for each row execute function public.set_updated_at();
drop trigger if exists notifications_set_created_by on public.notifications;
create trigger notifications_set_created_by before insert on public.notifications for each row execute function public.set_notification_created_by();
drop trigger if exists audit_logs_set_actor on public.audit_logs;
create trigger audit_logs_set_actor before insert on public.audit_logs for each row execute function public.set_audit_actor();
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.attendance_points enable row level security;
alter table public.attendance_settings enable row level security;
alter table public.attendances enable row level security;
alter table public.leave_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

insert into public.profiles (auth_user_id, active)
select auth_users.id, true
from auth.users auth_users
where not exists (
  select 1
  from public.profiles profiles
  where profiles.auth_user_id = auth_users.id
)
on conflict (auth_user_id) do nothing;

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth_user_id = auth.uid());

drop policy if exists students_admin_all on public.students;
create policy students_admin_all on public.students for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists students_student_select_own on public.students;
create policy students_student_select_own on public.students for select using (id = public.current_student_id());

drop policy if exists attendance_points_admin_all on public.attendance_points;
create policy attendance_points_admin_all on public.attendance_points for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists attendance_points_select_authenticated on public.attendance_points;
create policy attendance_points_select_authenticated on public.attendance_points for select using (auth.role() = 'authenticated');

drop policy if exists attendance_settings_admin_all on public.attendance_settings;
create policy attendance_settings_admin_all on public.attendance_settings for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists attendance_settings_select_authenticated on public.attendance_settings;
create policy attendance_settings_select_authenticated on public.attendance_settings for select using (auth.role() = 'authenticated');

drop policy if exists attendances_admin_all on public.attendances;
create policy attendances_admin_all on public.attendances for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists attendances_student_select_own on public.attendances;
create policy attendances_student_select_own on public.attendances for select using (student_id = public.current_student_id());

drop policy if exists leave_requests_admin_all on public.leave_requests;
create policy leave_requests_admin_all on public.leave_requests for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists leave_requests_student_select_own on public.leave_requests;
create policy leave_requests_student_select_own on public.leave_requests for select using (student_id = public.current_student_id());
drop policy if exists leave_requests_student_insert_own on public.leave_requests;
create policy leave_requests_student_insert_own on public.leave_requests for insert with check (student_id = public.current_student_id());

drop policy if exists notifications_admin_all on public.notifications;
create policy notifications_admin_all on public.notifications for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications for select using (recipient_auth_user_id = auth.uid());
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update using (recipient_auth_user_id = auth.uid()) with check (recipient_auth_user_id = auth.uid());

drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin on public.audit_logs for select using (public.is_admin());
drop policy if exists audit_logs_insert_authenticated on public.audit_logs;
create policy audit_logs_insert_authenticated on public.audit_logs for insert with check (auth.role() = 'authenticated');
