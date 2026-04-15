-- Update perform_attendance_action untuk menggunakan timezone Asia/Jakarta
-- Fix masalah "Waktu check-in tidak valid" saat waktu masih sesuai di Indonesia

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
      raise exception 'Absen masuk hari ini sudah tercatat.';
    end if;

    if local_now < target_settings.check_in_start or local_now > target_settings.check_in_end then
      insert into public.audit_logs (action, description, metadata)
      values ('attendance_reject_time', 'Absen masuk ditolak karena di luar waktu absensi.', jsonb_build_object('time', local_now));
      raise exception 'Waktu absen masuk tidak valid. Saat ini jam % sedangkan absen masuk hanya dibuka dari jam % sampai jam %.', 
        substring(local_now::text from 1 for 5), 
        substring(target_settings.check_in_start::text from 1 for 5), 
        substring(target_settings.check_in_end::text from 1 for 5);
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
    values (auth.uid(), 'Absen masuk berhasil', 'Absen masuk Anda berhasil dicatat oleh sistem.', 'attendance_success');

    insert into public.audit_logs (action, description, metadata)
    values ('attendance_check_in', 'Siswa melakukan absen masuk.', jsonb_build_object('student_id', target_student.id, 'status', resulting_status));

    return affected_row;
  elsif action_name = 'check_out' then
    if existing_attendance.check_out_at is not null then
      raise exception 'Absen keluar hari ini sudah tercatat.';
    end if;

    if local_now < target_settings.check_out_start or local_now > target_settings.check_out_end then
      insert into public.audit_logs (action, description, metadata)
      values ('attendance_reject_time', 'Absen keluar ditolak karena di luar waktu absensi.', jsonb_build_object('time', local_now));
      raise exception 'Waktu absen keluar tidak valid. Saat ini jam % sedangkan absen keluar hanya dibuka dari jam % sampai jam %.', 
        substring(local_now::text from 1 for 5), 
        substring(target_settings.check_out_start::text from 1 for 5), 
        substring(target_settings.check_out_end::text from 1 for 5);
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
      raise exception 'Absen masuk belum ditemukan untuk hari ini.';
    end if;

    insert into public.notifications (recipient_auth_user_id, title, message, event_type)
    values (auth.uid(), 'Absen keluar berhasil', 'Absen keluar Anda berhasil dicatat oleh sistem.', 'attendance_success');

    insert into public.audit_logs (action, description, metadata)
    values ('attendance_check_out', 'Siswa melakukan absen keluar.', jsonb_build_object('student_id', target_student.id));

    return affected_row;
  else
    raise exception 'Aksi absensi tidak dikenal.';
  end if;
end;
$$;
