-- =======================================================
-- PATCH v3: Fix Notifikasi Admin (Trigger Approach)
-- Jalankan di Supabase Dashboard → SQL Editor
-- =======================================================

-- PART 1: Izinkan authenticated user INSERT ke notifications
drop policy if exists notifications_student_insert on public.notifications;
create policy notifications_student_insert on public.notifications
  for insert
  with check (auth.role() = 'authenticated');

-- PART 2: Buat trigger function (SECURITY DEFINER = bypass RLS penuh)
--         Tidak ada deklarasi tipe custom sama sekali → tidak ada error tipe
create or replace function public.notify_admins_on_leave_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s_name text;
  j_label text;
begin
  -- Ambil nama siswa
  select name into s_name from public.students where id = NEW.student_id;

  -- Label jenis pengajuan
  j_label := case when NEW.request_type::text = 'leave' then 'Izin' else 'Sakit' end;

  -- Insert notifikasi ke semua admin aktif
  insert into public.notifications (recipient_auth_user_id, title, message, event_type)
  select
    p.auth_user_id,
    'Pengajuan ' || j_label || ' Baru',
    coalesce(s_name, 'Siswa') || ' mengajukan ' || lower(j_label) ||
      ' mulai ' || NEW.start_date::text || ' s.d. ' || NEW.end_date::text ||
      '. Alasan: ' || left(NEW.reason, 80),
    'leave_request_submit'
  from public.profiles p
  where p.role = 'admin' and p.active = true;

  return NEW;
end;
$$;

-- PART 3: Pasang trigger pada tabel leave_requests
drop trigger if exists on_leave_request_created on public.leave_requests;
create trigger on_leave_request_created
  after insert on public.leave_requests
  for each row execute function public.notify_admins_on_leave_request();
