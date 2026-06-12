-- Ubah foreign key pada profiles agar menghapus profile ketika student dihapus,
-- bukan malah menyetelnya ke null (yang memicu trigger pembuatan siswa zombie).

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_student_id_fkey;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_student_id_fkey
FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
