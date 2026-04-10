import { LogOut } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function PendingAccessPage() {
  const { profile, signOut, signingOut } = useAuth();

  const needsRole = !profile?.role;
  const needsStudentLink = profile?.role === 'student' && !profile?.student_id;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-10">
      <div className="mb-6 flex w-full max-w-4xl items-center gap-3 lg:hidden">
        <img src="/logo.png" alt="UABSEN" className="h-8 w-8 shrink-0 object-contain" />
        <p className="text-sm font-bold tracking-wide text-primary/80">UABSEN</p>
      </div>
      <div className="flex w-full max-w-4xl flex-col-reverse gap-10 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <section className="page-hero">
          <div className="hidden items-center gap-3 lg:flex">
            <img src="/logo.png" alt="UABSEN" className="h-8 w-8 shrink-0 object-contain" />
            <p className="text-sm font-bold tracking-wide text-primary/80">UABSEN</p>
          </div>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-[-0.04em] text-ink md:text-4xl">Akses akun belum siap dipakai.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Akun Anda sudah berhasil masuk, tetapi aksesnya masih perlu dilengkapi agar semua fitur bisa digunakan.
          </p>
        </section>

        <section className="card p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Status Akun
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-ink md:text-3xl">Lengkapi akses akun</h2>
          <div className="mt-6 grid gap-3">
            {needsRole && (
              <div className="field-note border-amber-200 bg-amber-50 text-amber-800">
                Peran akun ini belum dipilih. Minta admin menentukan akses akun sebagai Admin atau Siswa.
              </div>
            )}
            {needsStudentLink && (
              <div className="field-note border-sky-200 bg-sky-50 text-sky-800">
                Akun siswa ini belum dihubungkan ke data siswa. Minta admin menyambungkan profil akun dengan data siswa.
              </div>
            )}
            {!needsRole && !needsStudentLink && (
              <div className="field-note border-slate-200 bg-slate-50 text-slate-700">
                Akses akun masih dibatasi. Silakan hubungi admin untuk memastikan data akun sudah aktif dan lengkap.
              </div>
            )}
          </div>

          <button type="button" onClick={signOut} className="btn-secondary mt-6" disabled={signingOut}>
            <LogOut size={16} />
            {signingOut ? 'Keluar...' : 'Keluar'}
          </button>
        </section>
      </div>
    </div>
  );
}
