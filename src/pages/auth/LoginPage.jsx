import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
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
    <div className="flex min-h-screen flex-col items-center justify-start px-4 py-12 md:justify-center md:p-10">
      <div className="mb-8 flex w-full max-w-5xl items-center gap-3 lg:hidden">
        <img src="/logo.png" alt="UABSEN" className="h-8 w-8 shrink-0 object-contain" />
        <p className="text-sm font-bold tracking-wide text-primary/80">UABSEN</p>
      </div>
      <div className="flex w-full max-w-5xl flex-col-reverse gap-10 lg:grid lg:grid-cols-[1.08fr_0.92fr] lg:gap-8">
        <section className="page-hero">
          <div className="hidden items-center gap-3 lg:flex">
            <img src="/logo.png" alt="UABSEN" className="h-8 w-8 shrink-0 object-contain" />
            <p className="text-sm font-bold tracking-wide text-primary/80">UABSEN</p>
          </div>
          <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-ink md:text-4xl">
            Sistem Absensi Siswa untuk operasional LPK yang cepat dan rapi.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
            Login hanya tersedia untuk Admin dan siswa yang sudah dibuatkan akun oleh Admin. Tidak
            ada pendaftaran publik pada fase ini.
          </p>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              'Validasi check-in/check-out berbasis lokasi',
              'Pengajuan izin dan sakit dengan approval admin',
              'Audit log, notifikasi, PDF, dan CSV siap pakai',
            ].map((item) => (
              <div key={item} className="surface-subtle p-4">
                <p className="text-sm font-medium leading-6 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5 md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Masuk ke Aplikasi
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-ink md:text-3xl">Selamat Datang</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Gunakan akun Yang Sudah disiapkan oleh admin.
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
    </div>
  );
}
