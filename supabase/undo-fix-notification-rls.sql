-- =======================================================
-- UNDO PATCH: Kembalikan kondisi database seperti semula
-- Jalankan di Supabase Dashboard → SQL Editor
-- =======================================================

-- 1. Hapus policy INSERT untuk siswa
drop policy if exists notifications_student_insert on public.notifications;

-- 2. Hapus trigger dan functionnya
drop trigger if exists on_leave_request_created on public.leave_requests;
drop function if exists public.notify_admins_on_leave_request();

-- 3. Kembalikan fungsi submit_leave_request ke asalnya
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
