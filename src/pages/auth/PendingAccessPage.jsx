import { ArrowRight, Clock3, LogOut, ShieldAlert } from 'lucide-react';
import PublicPageFrame from '../../components/PublicPageFrame';
import { useAuth } from '../../hooks/useAuth';

export default function PendingAccessPage() {
  const { profile, signOut, signingOut } = useAuth();

  const needsRole = !profile?.role;
  const needsStudentLink = profile?.role === 'student' && !profile?.student_id;

  return (
    <PublicPageFrame currentPath="/pending-access" sectionBasePath="/" mainClassName="pb-14 md:pb-20">
      <div className="public-hero-grid lg:grid-cols-[1.02fr_0.98fr]">
          <section className="page-hero rounded-[28px]">
            <div className="public-badge-warn">
              <ShieldAlert size={14} />
              Akses Belum Lengkap
            </div>
            <h1 className="public-heading-xl">
              Akun Anda berhasil masuk, tetapi aksesnya belum lengkap untuk memakai semua fitur.
            </h1>
            <p className="public-copy">
              Biasanya ini terjadi karena peran akun belum ditentukan atau data siswa belum ditautkan. Setelah admin
              melengkapinya, Anda bisa langsung lanjut memakai dashboard sesuai akses yang diberikan.
            </p>

            <div className="public-chip-grid md:grid-cols-2">
              <div className="public-panel-soft p-4">
                <p className="text-sm font-semibold text-ink">Cek peran akun</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Pastikan admin sudah menentukan akun ini sebagai admin atau siswa aktif.
                </p>
              </div>
              <div className="public-panel-soft p-4">
                <p className="text-sm font-semibold text-ink">Cek tautan data siswa</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Untuk akun siswa, admin perlu menautkan profil ke data siswa yang benar.
                </p>
              </div>
            </div>

            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/88 px-4 py-2 text-sm font-medium text-slate-600">
              <Clock3 size={16} className="text-primary" />
              Setelah data akun lengkap, akses akan langsung bisa dipakai.
            </div>
          </section>

          <section className="public-panel p-5 md:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Status Akun</p>
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

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href="/#mulai" className="btn-secondary">
                Lihat Panduan Singkat
                <ArrowRight size={16} />
              </a>
              <button type="button" onClick={signOut} className="btn-secondary" disabled={signingOut}>
                <LogOut size={16} />
                {signingOut ? 'Keluar...' : 'Keluar'}
              </button>
            </div>
          </section>
      </div>
    </PublicPageFrame>
  );
}
