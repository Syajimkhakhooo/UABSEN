import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { ArrowRight, LogIn, ShieldCheck, Sparkles } from 'lucide-react';
import PublicPageFrame from '../../components/PublicPageFrame';
import { useAuth } from '../../hooks/useAuth';
import { activateLoginLockIfNeeded, getLoginLockState } from '../../lib/loginThrottle';

export default function LoginPage() {
  const { profile, signIn } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lockState, setLockState] = useState(() => getLoginLockState(''));

  useEffect(() => {
    const syncLockState = () => setLockState(getLoginLockState(form.email));

    syncLockState();

    if (!form.email) {
      return undefined;
    }

    const intervalId = window.setInterval(syncLockState, 1000);
    return () => window.clearInterval(intervalId);
  }, [form.email]);

  if (profile) {
    if (!profile.role) {
      return <Navigate to="/pending-access" replace />;
    }

    return <Navigate to={profile.role === 'admin' ? '/admin' : '/student'} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const currentLockState = activateLoginLockIfNeeded(form.email);
    setLockState(currentLockState);

    if (currentLockState.locked) {
      setError(currentLockState.message);
      return;
    }

    setSubmitting(true);

    try {
      await signIn(form.email, form.password);
    } catch (err) {
      setError(err.message ?? 'Login gagal. Periksa kembali email dan password.');
      setLockState(getLoginLockState(form.email));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicPageFrame currentPath="/login" sectionBasePath="/" mainClassName="pb-14 md:pb-20">
      <div className="public-hero-grid lg:grid-cols-[1.06fr_0.94fr]">
          <section className="page-hero rounded-[28px]">
            <div className="public-badge-primary">
              <ShieldCheck size={14} />
              Portal Masuk UABSEN
            </div>

            <h1 className="public-heading-xl">
              Silahkan Login Untuk Melakukan Absensi 
            </h1>

            <p className="public-copy">
              UABSEN membantu proses absensi harian tetap tertib dengan validasi lokasi, pengaturan jam, notifikasi,
              dan riwayat yang mudah dipantau dalam satu sistem.
            </p>

            <div className="public-chip-grid md:grid-cols-3">
              {[
                'Validasi absen masuk/absen keluar berbasis lokasi',
                'Pengajuan izin dan sakit dengan approval admin',
                'Audit log, notifikasi, PDF, dan CSV siap pakai',
              ].map((item) => (
                <div key={item} className="public-panel-soft p-4">
                  <p className="text-sm font-medium leading-6 text-slate-700">{item}</p>
                </div>
              ))}
            </div>

            <div className="public-action-row">
              <a href="/#fitur" className="btn-secondary">
                Lihat Fitur Utama
              </a>
              <a href="/#mulai" className="btn-secondary">
                Pelajari Alurnya
                <ArrowRight size={16} />
              </a>
            </div>
          </section>

          <section className="public-panel p-5 md:p-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles size={14} />
              Masuk ke Aplikasi
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-ink md:text-3xl">Selamat Datang</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Gunakan akun yang sudah dibuatkan admin untuk melanjutkan aktivitas absensi Anda.
            </p>

            <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => {
                    setForm((value) => ({ ...value, email: event.target.value }));
                    setError('');
                  }}
                  placeholder="admin@example.com"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-600">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => {
                    setForm((value) => ({ ...value, password: event.target.value }));
                    setError('');
                  }}
                  placeholder="Masukkan password"
                  required
                />
              </div>

              {error && <p className="field-note border-rose-200 bg-rose-50 text-rose-600">{error}</p>}
              {!error && lockState.locked && (
                <p className="field-note border-amber-200 bg-amber-50 text-amber-700">
                  Login untuk email ini dikunci sementara. Coba lagi dalam {lockState.remainingText}.
                </p>
              )}

              <button type="submit" className="btn-primary mt-2 w-full" disabled={submitting || lockState.locked}>
                <LogIn size={18} />
                {submitting ? 'Memproses...' : lockState.locked ? 'Coba Lagi Nanti' : 'Masuk'}
              </button>
            </form>
          </section>
      </div>
    </PublicPageFrame>
  );
}
