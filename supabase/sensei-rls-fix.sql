-- 1. Buat fungsi helper untuk mendeteksi apakah user aktif login memiliki role 'sensei'
CREATE OR REPLACE FUNCTION public.is_sensei()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (
      SELECT role = 'sensei' AND active = true
      FROM public.profiles
      WHERE auth_user_id = auth.uid()
    ),
    false
  );
$$;

-- 2. Tambahkan kebijakan (policies) baru agar Sensei dapat membaca (dan mengubah, jika diizinkan) data yang relevan.
-- Kita menggunakan nama policy yang berbeda agar tidak bentrok dengan policy 'admin'.

-- Untuk tabel profiles
DROP POLICY IF EXISTS profiles_sensei_all ON public.profiles;
CREATE POLICY profiles_sensei_all ON public.profiles FOR ALL USING (public.is_sensei()) WITH CHECK (public.is_sensei());

-- Untuk tabel students
DROP POLICY IF EXISTS students_sensei_all ON public.students;
CREATE POLICY students_sensei_all ON public.students FOR ALL USING (public.is_sensei()) WITH CHECK (public.is_sensei());

-- Untuk tabel attendances
DROP POLICY IF EXISTS attendances_sensei_all ON public.attendances;
CREATE POLICY attendances_sensei_all ON public.attendances FOR ALL USING (public.is_sensei()) WITH CHECK (public.is_sensei());

-- Untuk tabel leave_requests
DROP POLICY IF EXISTS leave_requests_sensei_all ON public.leave_requests;
CREATE POLICY leave_requests_sensei_all ON public.leave_requests FOR ALL USING (public.is_sensei()) WITH CHECK (public.is_sensei());

-- Untuk tabel notifications
DROP POLICY IF EXISTS notifications_sensei_all ON public.notifications;
CREATE POLICY notifications_sensei_all ON public.notifications FOR ALL USING (public.is_sensei()) WITH CHECK (public.is_sensei());
