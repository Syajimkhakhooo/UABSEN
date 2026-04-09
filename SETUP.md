# UABSEN Setup Guide

## 1. Ringkasan Implementasi

Project ini mengikuti scope fase 1 UABSEN:

- Role hanya `admin` dan `student`
- Tidak ada public sign-up
- Data master siswa terpisah dari `auth.users`
- Admin dapat membuat siswa tanpa login
- Admin dapat membuat akun login siswa kemudian menautkannya ke `profiles.student_id`
- Validasi absensi memakai lokasi, radius, dan jam operasional
- Izin/sakit memakai alur approval admin
- Notifikasi, audit log, koreksi manual, PDF, dan CSV tersedia

## 2. Install Dependency

1. Salin `.env.example` menjadi `.env`
2. Isi:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Catatan penting:

- `.env` hanya untuk frontend/browser.
- Jangan isi `SUPABASE_SERVICE_ROLE_KEY` di `.env` frontend.
- `SUPABASE_SERVICE_ROLE_KEY` hanya dipakai oleh Edge Function dan harus diset sebagai secret di project Supabase.

3. Install package:

```bash
npm install
```

4. Jalankan lokal:

```bash
npm run dev
```

## 3. SQL Supabase

Jalankan file berikut di Supabase SQL Editor:

- `supabase/schema.sql`

File tersebut sudah mencakup:

- tabel utama
- enum
- helper function
- RPC absensi
- RPC review izin/sakit
- RPC koreksi manual
- RPC broadcast notifikasi
- trigger
- Row Level Security

## 4. Logic Auth Sederhana

Logic baru dibuat sesederhana mungkin:

1. Buat akun langsung di Supabase Authentication
2. Trigger akan otomatis membuat row di `public.profiles`
3. Jika akun ingin dijadikan admin, ubah `public.profiles.role` menjadi `admin`
4. Jika akun ingin dijadikan student, ubah `public.profiles.role` menjadi `student`
5. Jika `role = student` dan `student_id` masih kosong, trigger akan otomatis membuat data siswa placeholder lalu mengisi `public.profiles.student_id`
6. Jika ingin memakai data siswa yang sudah ada, cukup isi `public.profiles.student_id` ke record siswa yang benar

Contoh akun admin:

```sql
update public.profiles
set role = 'admin', active = true
where auth_user_id = 'AUTH_USER_UUID_HERE';
```

Contoh akun student:

```sql
update public.profiles
set role = 'student', active = true
where auth_user_id = 'AUTH_USER_UUID_HERE';
```

Contoh jika ingin langsung ditautkan ke data siswa existing:

```sql
update public.profiles
set role = 'student',
    student_id = 'STUDENT_UUID_HERE',
    active = true
where auth_user_id = 'AUTH_USER_UUID_HERE';
```

## 5. Seed Pengaturan Awal Absensi

Sistem membutuhkan satu titik absensi aktif dan satu row pengaturan waktu. Bisa diinput dari UI admin setelah admin login, atau pakai SQL awal berikut:

```sql
insert into public.attendance_points (name, latitude, longitude, radius_meters, is_active)
values ('Kampus Utama', -6.200000, 106.816666, 150, true);

insert into public.attendance_settings (
  check_in_start,
  present_cutoff,
  late_cutoff,
  check_in_end,
  check_out_start,
  check_out_end,
  gps_accuracy_threshold
)
values ('07:00', '08:00', '08:30', '09:00', '16:00', '18:00', 100);
```

## 6. Edge Function: Create Student Account

Karena pembuatan user Supabase Auth adalah aksi privileged, flow `admin creates student login account` dijalankan melalui Edge Function:

- source: `supabase/functions/create-student-account/index.ts`
- source: `supabase/functions/reset-student-password/index.ts`

Deploy:

```bash
supabase functions deploy create-student-account
supabase functions deploy reset-student-password
```

Pastikan secret berikut tersedia pada project Supabase:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`

Contoh nilainya ada di:

- frontend: `.env.example`
- edge function: `supabase/.env.functions.example`

Function ini:

- memverifikasi requester adalah admin
- membuat auth user student
- mengisi `public.profiles.role = student`
- menautkan `public.profiles.student_id` ke master data siswa
- membuat notifikasi awal
- menyimpan audit log

Function `reset-student-password` dipakai untuk:

- mereset password akun siswa dari sisi admin
- mengirim notifikasi ke akun siswa
- menyimpan audit log reset password

## 7. Alur Operasional Utama

### Admin membuat siswa tanpa login

1. Login sebagai admin
2. Buka `Data Siswa`
3. Klik `Tambah Siswa`
4. Simpan master data tanpa membuat akun

### Admin membuat login untuk siswa existing

1. Buka `Data Siswa`
2. Pilih siswa tanpa login
3. Klik `Buat Login`
4. Isi email dan password awal
5. Sistem membuat Supabase Auth user dan menautkan `profiles.student_id` ke record siswa yang sudah ada

### Student attendance

1. Siswa login
2. Dari dashboard, klik `Check In`
3. Sistem memvalidasi GPS, radius, dan jam
4. Siswa klik `Check Out` saat pulang

### Leave / sick

1. Siswa buka `Izin/Sakit`
2. Kirim pengajuan
3. Admin review di `Izin & Sakit`
4. Jika disetujui, status absensi tercermin pada laporan

## 8. Verifikasi Scope

Implementasi ini sengaja **tidak** menambahkan:

- public registration
- QR attendance
- selfie verification
- SIMAK integration
- subject-based schedule
- role instructor/sensei
- fingerprint device

## 9. Build Verification

Setelah dependency terpasang:

```bash
npm run build
```

Jika build sukses, lanjut uji manual:

1. Admin create student tanpa login
2. Admin create login untuk student existing
3. Student login
4. Student check-in dan check-out
5. Student submit izin/sakit
6. Admin approve/reject
7. Notifikasi muncul
8. Koreksi manual tercatat
9. Export PDF/CSV berjalan
