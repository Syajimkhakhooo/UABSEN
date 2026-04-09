import { KeyRound, Plus, UserRoundPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import {
  createStudentAccount,
  deleteStudent,
  listStudents,
  logAudit,
  resetStudentPassword,
  saveStudent,
} from '../../lib/uabsenApi';

const initialStudentForm = {
  id: '',
  student_number: '',
  name: '',
  phone: '',
  address: '',
  training_program: '',
  active: true,
};

const initialAccountForm = {
  student_id: '',
  email: '',
  password: '',
};

const initialResetPasswordForm = {
  student_id: '',
  student_name: '',
  password: '',
  confirmPassword: '',
};

export default function StudentManagementPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [studentForm, setStudentForm] = useState(initialStudentForm);
  const [accountForm, setAccountForm] = useState(initialAccountForm);
  const [resetPasswordForm, setResetPasswordForm] = useState(initialResetPasswordForm);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, studentId: '', studentName: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadStudents() {
    const data = await listStudents(search);
    setStudents(data);
  }

  useEffect(() => {
    loadStudents();
  }, [search]);

  const linkedCount = useMemo(
    () => students.filter((student) => Boolean(student.auth_user_id)).length,
    [students],
  );

  async function handleStudentSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const saved = await saveStudent(studentForm);
      await logAudit(
        studentForm.id ? 'student_update' : 'student_create',
        studentForm.id ? 'Data siswa diperbarui oleh admin.' : 'Data siswa dibuat oleh admin.',
        { student_id: saved.id },
      );
      setStudentForm(initialStudentForm);
      setStudentModalOpen(false);
      await loadStudents();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateAccount(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await createStudentAccount(accountForm);
      await logAudit(
        'student_account_create',
        'Akun login siswa dibuat dan ditautkan ke data master.',
        { student_id: accountForm.student_id, email: accountForm.email },
      );
      setAccountForm(initialAccountForm);
      setAccountModalOpen(false);
      setSuccess('Akun login siswa berhasil dibuat.');
      await loadStudents();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteStudent() {
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await deleteStudent(deleteDialog.studentId);
      await loadStudents();
      setDeleteDialog({ open: false, studentId: '', studentName: '' });
      setSuccess('Data siswa berhasil dihapus.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPasswordSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    if (!resetPasswordForm.password || !resetPasswordForm.confirmPassword) {
      setError('Password baru dan konfirmasi password wajib diisi.');
      setSubmitting(false);
      return;
    }

    if (resetPasswordForm.password.length < 6) {
      setError('Password baru minimal 6 karakter.');
      setSubmitting(false);
      return;
    }

    if (resetPasswordForm.password !== resetPasswordForm.confirmPassword) {
      setError('Konfirmasi password belum sama.');
      setSubmitting(false);
      return;
    }

    try {
      const result = await resetStudentPassword(resetPasswordForm);
      setResetPasswordForm(initialResetPasswordForm);
      setResetPasswordModalOpen(false);
      setSuccess(result?.message ?? 'Password siswa berhasil direset.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <SectionCard title="Total Record" className="sm:col-span-1">
          <p className="text-3xl font-extrabold text-primary">{students.length}</p>
        </SectionCard>
        <SectionCard title="Akun Login Tertaut" className="sm:col-span-1">
          <p className="text-3xl font-extrabold text-emerald-600">{linkedCount}</p>
        </SectionCard>
        <SectionCard title="Tanpa Login" className="sm:col-span-1">
          <p className="text-3xl font-extrabold text-amber-600">{students.length - linkedCount}</p>
        </SectionCard>
      </div>

      <SectionCard
        title="Manajemen Data Siswa"
        description="Admin dapat membuat master data siswa tanpa akun login, lalu menautkannya ke profile login kapan saja."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setStudentForm(initialStudentForm);
                setStudentModalOpen(true);
              }}
            >
              <Plus size={16} />
              Tambah Siswa
            </button>
          </div>
        }
      >
        <div className="mb-4">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setError('');
              setSuccess('');
            }}
            placeholder="Cari nama, nomor induk, atau program..."
          />
        </div>

        {error && <p className="field-note mb-4 border-rose-200 bg-rose-50 text-rose-600">{error}</p>}
        {success && <p className="field-note mb-4 border-emerald-200 bg-emerald-50 text-emerald-700">{success}</p>}

        {students.length ? (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Siswa</th>
                  <th>Program</th>
                  <th>Status</th>
                  <th>Login</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const hasProfile = Boolean(student.auth_user_id);
                  return (
                    <tr key={student.id} className="border-t border-slate-100">
                      <td>
                        <div className="font-semibold text-ink">{student.name}</div>
                        <div className="text-xs text-slate-500">{student.student_number}</div>
                      </td>
                      <td>{student.training_program || '-'}</td>
                      <td>
                        <span
                          className={`badge ${
                            student.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {student.active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td>
                        {hasProfile ? (
                          <StatusBadge status="approved" type="request" />
                        ) : (
                          <span className="badge bg-amber-100 text-amber-700">Belum dibuat</span>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="text-xs font-semibold text-slate-500 hover:text-primary"
                            onClick={() => {
                              setError('');
                              setSuccess('');
                              setStudentForm(student);
                              setStudentModalOpen(true);
                            }}
                          >
                            Edit Data
                          </button>
                          {hasProfile && (
                            <>
                              <span className="text-slate-300">|</span>
                              <button
                                type="button"
                                className="text-xs font-semibold text-slate-500 hover:text-primary"
                                onClick={() => {
                                  setError('');
                                  setSuccess('');
                                  setResetPasswordForm({
                                    student_id: student.id,
                                    student_name: student.name,
                                    password: '',
                                    confirmPassword: '',
                                  });
                                  setResetPasswordModalOpen(true);
                                }}
                              >
                                Reset Password
                              </button>
                            </>
                          )}
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                            onClick={() =>
                              setDeleteDialog({
                                open: true,
                                studentId: student.id,
                                studentName: student.name,
                              })
                            }
                          >
                            Hapus
                          </button>
                        </div>
                          {!hasProfile && (
                            <button
                              type="button"
                              className="btn-primary !px-3 !py-2"
                              onClick={() => {
                                setAccountForm({ ...initialAccountForm, student_id: student.id });
                                setAccountModalOpen(true);
                              }}
                            >
                              <UserRoundPlus size={16} />
                              Buat Login
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Belum ada data siswa"
            description="Tambahkan data master siswa terlebih dahulu. Akun login bisa dibuat belakangan."
          />
        )}
      </SectionCard>

      <Modal
        open={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        title={studentForm.id ? 'Edit Data Siswa' : 'Tambah Data Siswa'}
        description="Master data siswa bersifat independen dari akun login Supabase Auth."
      >
        <form className="grid gap-4" onSubmit={handleStudentSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">Nomor Induk</label>
              <input
                value={studentForm.student_number}
                onChange={(event) =>
                  setStudentForm((value) => ({ ...value, student_number: event.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">Nama Siswa</label>
              <input
                value={studentForm.name}
                onChange={(event) =>
                  setStudentForm((value) => ({ ...value, name: event.target.value }))
                }
                required
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">No. Telepon</label>
              <input
                value={studentForm.phone}
                onChange={(event) =>
                  setStudentForm((value) => ({ ...value, phone: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-600">Program</label>
              <input
                value={studentForm.training_program}
                onChange={(event) =>
                  setStudentForm((value) => ({ ...value, training_program: event.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Alamat</label>
            <textarea
              rows="3"
              value={studentForm.address}
              onChange={(event) =>
                setStudentForm((value) => ({ ...value, address: event.target.value }))
              }
            />
          </div>
          <label className="surface-subtle flex items-center gap-3 px-4 py-3 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={studentForm.active}
              onChange={(event) =>
                setStudentForm((value) => ({ ...value, active: event.target.checked }))
              }
            />
            Siswa aktif
          </label>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setStudentModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        title="Buat Akun Login Siswa"
        description="Akun akan dibuat di Supabase Auth lalu profile login langsung ditautkan ke record siswa yang sudah ada."
      >
        <form className="grid gap-4" onSubmit={handleCreateAccount}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Email Login</label>
            <input
              type="email"
              value={accountForm.email}
              onChange={(event) => setAccountForm((value) => ({ ...value, email: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Password Awal</label>
            <input
              type="password"
              value={accountForm.password}
              onChange={(event) =>
                setAccountForm((value) => ({ ...value, password: event.target.value }))
              }
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setAccountModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Membuat akun...' : 'Buat & Tautkan'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={resetPasswordModalOpen}
        onClose={() => {
          if (!submitting) {
            setResetPasswordModalOpen(false);
            setResetPasswordForm(initialResetPasswordForm);
          }
        }}
        title={`Reset Password ${resetPasswordForm.student_name || 'Siswa'}`}
        description="Admin dapat mengganti password akun siswa. Setelah login, siswa tetap bisa mengganti lagi dari halaman profilnya sendiri."
      >
        <form className="grid gap-4" onSubmit={handleResetPasswordSubmit}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Password Baru</label>
            <input
              type="password"
              value={resetPasswordForm.password}
              onChange={(event) =>
                setResetPasswordForm((value) => ({ ...value, password: event.target.value }))
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
              value={resetPasswordForm.confirmPassword}
              onChange={(event) =>
                setResetPasswordForm((value) => ({ ...value, confirmPassword: event.target.value }))
              }
              required
            />
          </div>
          <p className="field-note border-amber-200 bg-amber-50 text-amber-800">
            Password lama siswa akan langsung diganti. Beri tahu siswa untuk login memakai password baru ini.
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setResetPasswordModalOpen(false);
                setResetPasswordForm(initialResetPasswordForm);
              }}
            >
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              <KeyRound size={16} />
              {submitting ? 'Menyimpan...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, studentId: '', studentName: '' })}
        onConfirm={handleDeleteStudent}
        confirming={submitting}
        title={`Hapus seluruh data untuk ${deleteDialog.studentName || 'siswa'}?`}
        description="PERINGATAN: tindakan ini permanen. Riwayat absen, surat izin, dan akun login siswa yang tertaut akan ikut terhapus."
        confirmText="Ya, hapus"
        cancelText="Batal"
        tone="danger"
      />
    </div>
  );
}
