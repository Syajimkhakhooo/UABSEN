-- 1. Tambahkan Role 'sensei' (Jalankan ini terpisah jika error di Supabase Editor)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'sensei';
COMMIT;

-- 2. Perbaiki constraint profil agar menerima 'sensei'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS student_profile_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT student_profile_role_check CHECK (
  (role IN ('admin', 'sensei') AND student_id IS NULL) OR
  (role = 'student') OR
  (role IS NULL AND student_id IS NULL)
);

-- 3. Fungsi Reset Password oleh Admin
CREATE OR REPLACE FUNCTION public.admin_reset_student_password(
  target_student_id uuid,
  new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  target_auth_user_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat mereset password.';
  END IF;

  SELECT auth_user_id INTO target_auth_user_id
  FROM public.profiles
  WHERE student_id = target_student_id AND role = 'student' AND active = true
  LIMIT 1;

  IF target_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Siswa belum memiliki akun login tertaut.';
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(new_password, gen_salt('bf'))
  WHERE id = target_auth_user_id;

  RETURN true;
END;
$$;

-- 4. Fungsi Melihat Email Siswa
CREATE OR REPLACE FUNCTION public.admin_get_student_emails()
RETURNS table (
  student_id uuid,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat melihat email siswa.';
  END IF;

  RETURN QUERY
  SELECT p.student_id, u.email::text
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.auth_user_id
  WHERE p.role = 'student';
END;
$$;

-- 5. Fungsi Mendapatkan Profil Staf (Admin/Sensei)
CREATE OR REPLACE FUNCTION public.admin_get_staff_profiles()
RETURNS table (
  id uuid,
  auth_user_id uuid,
  email text,
  role public.user_role,
  active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat melihat data staf.';
  END IF;

  RETURN QUERY
  SELECT p.id, p.auth_user_id, u.email::text, p.role, p.active
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.auth_user_id
  WHERE p.role IN ('admin', 'sensei');
END;
$$;

-- 6. Fungsi Menghapus Akun Staf
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Hanya admin yang dapat menghapus data staf.';
  END IF;

  DELETE FROM auth.users WHERE id = target_user_id;
  RETURN true;
END;
$$;
