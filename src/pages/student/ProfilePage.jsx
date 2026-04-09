import { useState } from 'react';
import EmptyState from '../../components/EmptyState';
import SectionCard from '../../components/SectionCard';
import { useAuth } from '../../hooks/useAuth';
import { changeOwnPassword } from '../../lib/uabsenApi';

export default function ProfilePage() {
  const { profile } = useAuth();
  const student = profile?.students;
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!profile?.student_id) {
    return (
      <SectionCard
        title="Profil Saya"
        description="Profil detail siswa akan tampil setelah admin menautkan `profiles.student_id` akun ini ke data master siswa."
      >
        <EmptyState
          title="Profil siswa belum tersedia"
          description="Role student sudah aktif, tetapi akun ini belum terhubung ke record siswa."
        />
      </SectionCard>
    );
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!passwordForm.password || !passwordForm.confirmPassword) {
      setError('Password baru dan konfirmasi password wajib diisi.');
      return;
    }

    if (passwordForm.password.length < 6) {
      setError('Password baru minimal 6 karakter.');
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setError('Konfirmasi password belum sama.');
      return;
    }

    setSubmitting(true);

    try {
      await changeOwnPassword(passwordForm.password);
      setPasswordForm({ password: '', confirmPassword: '' });
      setPasswordOpen(false);
      setSuccess('Password akun berhasil diperbarui. Gunakan password baru saat login berikutnya.');
    } catch (err) {
      setError(err.message ?? 'Gagal memperbarui password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SectionCard
      title="Profil Saya"
      description="Data master siswa dikelola oleh admin. Jika ada perubahan, hubungi admin aplikasi."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="surface-subtle p-4 md:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Nama</p>
          <p className="mt-2 text-lg font-bold text-ink">{student?.name || '-'}</p>
        </div>
        <div className="surface-subtle p-4 md:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Nomor Induk</p>
          <p className="mt-2 text-lg font-bold text-ink">{student?.student_number || '-'}</p>
        </div>
        <div className="surface-subtle p-4 md:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">No. Telepon</p>
          <p className="mt-2 text-lg font-bold text-ink">{student?.phone || '-'}</p>
        </div>
        <div className="surface-subtle p-4 md:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Program</p>
          <p className="mt-2 text-lg font-bold text-ink">{student?.training_program || '-'}</p>
        </div>
      </div>

      <div className="surface-subtle mt-4 p-4 md:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Alamat</p>
        <p className="mt-2 text-sm leading-7 text-slate-600">{student?.address || '-'}</p>
      </div>

      <div className="surface-subtle mt-4 p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Keamanan Akun
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Jika akun ini awalnya dibuat admin, Anda bisa langsung mengganti password bawaan di sini.
            </p>
          </div>

          <label className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600">
            <span>Reset Password</span>
            <button
              type="button"
              role="switch"
              aria-checked={passwordOpen}
              onClick={() => {
                setPasswordOpen((value) => !value);
                setError('');
                setSuccess('');
              }}
              className={[
                'relative h-7 w-12 rounded-full transition',
                passwordOpen ? 'bg-primary' : 'bg-slate-200',
              ]
                .join(' ')
                .trim()}
            >
              <span
                className={[
                  'absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition',
                  passwordOpen ? 'left-6' : 'left-1',
                ]
                  .join(' ')
                  .trim()}
              />
            </button>
          </label>
        </div>

        {error && <p className="field-note mt-4 border-rose-200 bg-rose-50 text-rose-600">{error}</p>}
        {success && <p className="field-note mt-4 border-emerald-200 bg-emerald-50 text-emerald-700">{success}</p>}

        {passwordOpen && (
          <form className="mt-5 grid gap-4 md:max-w-xl" onSubmit={handlePasswordSubmit}>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">Password Baru</label>
              <input
                type="password"
                value={passwordForm.password}
                onChange={(event) =>
                  setPasswordForm((value) => ({ ...value, password: event.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((value) => ({ ...value, confirmPassword: event.target.value }))
                }
                required
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Menyimpan...' : 'Simpan Password Baru'}
              </button>
            </div>
          </form>
        )}
      </div>
    </SectionCard>
  );
}
