-- Membuat tabel kelas
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Tambahkan trigger set_updated_at untuk classes (jika belum ada)
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_public_classes_updated_at') then
    create trigger set_public_classes_updated_at
    before update on public.classes
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- Menambahkan kolom class_id pada tabel students
alter table public.students
add column if not exists class_id uuid references public.classes(id) on delete set null;

-- Opsional: buat indeks pada class_id
create index if not exists students_class_id_idx on public.students(class_id);

-- Pastikan tabel bisa diakses (Jika RLS diaktifkan)
alter table public.classes enable row level security;

drop policy if exists "Enable read access for all users" on public.classes;
create policy "Enable read access for all users" on public.classes for select using (true);

drop policy if exists "Enable insert for all users" on public.classes;
create policy "Enable insert for all users" on public.classes for insert with check (true);

drop policy if exists "Enable update for all users" on public.classes;
create policy "Enable update for all users" on public.classes for update using (true);

drop policy if exists "Enable delete for all users" on public.classes;
create policy "Enable delete for all users" on public.classes for delete using (true);
