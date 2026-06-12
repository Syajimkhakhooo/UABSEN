import { KeyRound, Plus, UserRoundPlus, Upload } from 'lucide-react';
import { useEffect, useMemo, useState, useRef } from 'react';
import Papa from 'papaparse';
import ConfirmDialog from '../../components/ConfirmDialog';
import EmptyState from '../../components/EmptyState';
import Modal from '../../components/Modal';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import { toUserMessage } from '../../lib/errorMessages';
import {
  createStudentAccount,
  deleteStudent,
  listStudents,
  logAudit,
  resetStudentPassword,
  saveStudent,
  bulkImportStudents,
  deleteAllStudents,
  listClasses,
} from '../../lib/uabsenApi';

const initialStudentForm = {
  id: '',
  student_number: '',
  name: '',
  phone: '',
  address: '',
  training_program: '',
  class_id: '',
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
  const [classes, setClasses] = useState([]);
  const [search, setSearch] = useState('');
  const [studentForm, setStudentForm] = useState(initialStudentForm);
  const [accountForm, setAccountForm] = useState(initialAccountForm);
  const [resetPasswordForm, setResetPasswordForm] = useState(initialResetPasswordForm);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, studentId: '', studentName: '' });
  const [deleteAllDialog, setDeleteAllDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const fileInputRef = useRef(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadStudents() {
    const [data, classesData] = await Promise.all([
      listStudents(search),
      listClasses(),
    ]);
    setStudents(data);
    setClasses(classesData);
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
      setError(toUserMessage(err, 'Data siswa belum bisa disimpan. Coba lagi sebentar.'));
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
      setError(toUserMessage(err, 'Akun login siswa belum bisa dibuat. Coba lagi sebentar.'));
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
      setError(toUserMessage(err, 'Data siswa belum bisa dihapus. Coba lagi sebentar.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteAllStudents() {
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await deleteAllStudents();
      await loadStudents();
      setDeleteAllDialog(false);
      setSuccess('Seluruh data siswa berhasil dihapus.');
    } catch (err) {
      setError(toUserMessage(err, 'Seluruh data siswa belum bisa dihapus. Coba lagi sebentar.'));
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
      setError(toUserMessage(err, 'Password siswa belum bisa direset. Coba lagi sebentar.'));
    } finally {
      setSubmitting(false);
    }
  }

  const handleImportCsv = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCsv(true);
    setError('');
    setSuccess('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rawData = results.data;

          if (!rawData.length) {
            throw new Error('File CSV kosong atau tidak valid.');
          }

          const studentsToImport = rawData.map((row) => {
            const rowKeys = Object.keys(row);
            const getVal = (possibleNames) => {
              for (const key of rowKeys) {
                if (possibleNames.includes(key.trim().toLowerCase())) {
                  return row[key]?.trim() || '';
                }
              }
              return '';
            };

            return {
              student_number: getVal(['no induk', 'nomor induk', 'student_number', 'nim', 'nis', 'no. induk']),
              name: getVal(['nama siswa', 'nama', 'name']),
              phone: getVal(['no. telepon', 'no telepon', 'telepon', 'phone']),
              training_program: getVal(['program', 'training program', 'training_program']),
              address: getVal(['alamat', 'address']),
              active: true,
            };
          }).filter(s => s.student_number && s.name); // Pastikan minimal ada no induk dan nama

          if (studentsToImport.length === 0) {
            throw new Error('Tidak ada data yang valid untuk diimpor. Pastikan header CSV memiliki kolom "no induk" dan "nama siswa".');
          }

          const count = await bulkImportStudents(studentsToImport);
          await logAudit('student_bulk_import', `Admin mengimpor ${count} data siswa dari CSV.`);
          setSuccess(`Berhasil mengimpor ${count} data siswa baru.`);
          await loadStudents();
        } catch (err) {
          setError(toUserMessage(err, 'Gagal mengimpor file CSV. Pastikan tidak ada nomor induk yang duplikat.'));
        } finally {
          setUploadingCsv(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      },
      error: (err) => {
        setError(`Gagal membaca file CSV: ${err.message}`);
        setUploadingCsv(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    });
  };

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
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleImportCsv}
              className="hidden"
            />
            <button
              type="button"
              className="btn-secondary w-full sm:w-auto"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingCsv}
            >
              <Upload size={16} />
              {uploadingCsv ? 'Mengimpor...' : 'Import CSV'}
            </button>
            <button
              type="button"
              className="btn-secondary w-full sm:w-auto text-rose-600 border-rose-200 hover:bg-rose-50"
              onClick={() => setDeleteAllDialog(true)}
            >
              Hapus Semua
            </button>
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
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
          <div className="table-shell">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>Siswa</th>
                  <th>Kelas & Program</th>
                  <th>Status</th>
                  <th>Login (Email)</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const hasProfile = Boolean(student.auth_user_id);
                  return (
                    <tr key={student.id} className="border-t border-slate-100">
                      <td data-label="Siswa">
                        <div className="font-semibold text-ink">{student.name}</div>
                        <div className="text-xs text-slate-500">{student.student_number}</div>
                      </td>
                      <td data-label="Kelas & Program">
                        <div className="font-medium text-slate-700">{student.classes?.name || 'Belum ada kelas'}</div>
                        <div className="text-xs text-slate-500">{student.training_program || '-'}</div>
                      </td>
                      <td data-label="Status">
                        <span
                          className={`badge ${
                            student.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {student.active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td data-label="Login (Email)">
                        {hasProfile ? (
                          <div className="flex flex-col gap-1 items-start">
                            <StatusBadge status="approved" type="request" />
                            {student.email && (
                              <span className="text-xs text-slate-500 max-w-[150px] truncate" title={student.email}>
                                {student.email}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="badge bg-amber-100 text-amber-700">Belum dibuat</span>
                        )}
                      </td>
                      <td data-label="Aksi">
                        <div className="table-action-stack">
                          <button
                            type="button"
                            className="table-text-button table-text-button-primary"
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
                            <button
                              type="button"
                              className="table-text-button table-text-button-primary"
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
                          )}
                          <button
                            type="button"
                            className="table-text-button table-text-button-danger"
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
              <label className="mb-2 block text-sm font-semibold text-slate-600">Kelas</label>
              <select
                value={studentForm.class_id || ''}
                onChange={(event) =>
                  setStudentForm((value) => ({ ...value, class_id: event.target.value }))
                }
                className="input-field w-full"
              >
                <option value="">-- Pilih Kelas --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
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
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => setStudentModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
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
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => setAccountModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
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
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn-secondary w-full sm:w-auto"
              onClick={() => {
                setResetPasswordModalOpen(false);
                setResetPasswordForm(initialResetPasswordForm);
              }}
            >
              Batal
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
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

      <ConfirmDialog
        open={deleteAllDialog}
        onClose={() => setDeleteAllDialog(false)}
        onConfirm={handleDeleteAllStudents}
        confirming={submitting}
        title="Hapus SELURUH data siswa?"
        description="PERINGATAN SANGAT FATAL: Ini akan menghapus SEMUA siswa dari database, termasuk riwayat absen, pengajuan izin, dan mencabut semua akses login mereka secara permanen! Pastikan Anda benar-benar yakin."
        confirmText="Ya, HAPUS SEMUA"
        cancelText="Batal"
        tone="danger"
      />
    </div>
  );
}
