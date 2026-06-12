import { AlertCircle, KeyRound, Plus, Trash2, ShieldCheck, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import Modal from '../../components/Modal';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import { createStaffAccount, deleteStaffAccount, listStaffAccounts, logAudit } from '../../lib/uabsenApi';

const createInitialState = {
  email: '',
  password: '',
  role: 'sensei',
};

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState(createInitialState);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null, submitting: false });

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    try {
      setLoading(true);
      setError(null);
      const data = await listStaffAccounts();
      setStaffList(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data staf.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();
    if (createForm.password.length < 6) {
      setCreateError('Password minimal 6 karakter.');
      return;
    }

    setCreateSubmitting(true);
    setCreateError('');

    try {
      await createStaffAccount({
        email: createForm.email,
        password: createForm.password,
        role: createForm.role,
      });

      await logAudit('staff_create', `Admin membuat akun staf baru (${createForm.role}).`, {
        email: createForm.email,
      });

      setCreateForm(createInitialState);
      setCreateModalOpen(false);
      loadStaff();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Gagal membuat akun.');
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteDialog.user) return;

    setDeleteDialog((prev) => ({ ...prev, submitting: true }));
    try {
      await deleteStaffAccount(deleteDialog.user.auth_user_id);
      await logAudit('staff_delete', `Admin menghapus akun staf.`, {
        email: deleteDialog.user.email,
      });
      loadStaff();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus staf.');
    } finally {
      setDeleteDialog({ open: false, user: null, submitting: false });
    }
  }

  return (
    <SectionCard title="Manajemen Staf & Sensei" description="Kelola akun Admin dan Sensei di sini.">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              setCreateForm(createInitialState);
              setCreateError('');
              setCreateModalOpen(true);
            }}
          >
            <Plus size={18} />
            <span>Tambah Akun</span>
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={loadStaff}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-[18px] border border-rose-200 bg-rose-50 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-rose-500" />
          <h3 className="mb-1 font-semibold text-rose-800">Gagal Memuat Data</h3>
          <p className="text-sm text-rose-600">{error}</p>
          <button type="button" onClick={loadStaff} className="btn-secondary mt-4 bg-white">
            Coba Lagi
          </button>
        </div>
      ) : (
        <div className="table-shell border border-slate-200/80">
          <table className="responsive-table">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/50">
                <th>No</th>
                <th>Email Login</th>
                <th>Peran (Role)</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">
                    Memuat data...
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">
                    Belum ada data staf.
                  </td>
                </tr>
              ) : (
                staffList.map((staff, idx) => (
                  <tr key={staff.id} className="transition-colors hover:bg-slate-50/50">
                    <td data-label="No">{idx + 1}</td>
                    <td data-label="Email Login">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-slate-400" />
                        <span className="font-medium text-slate-700">{staff.email}</span>
                      </div>
                    </td>
                    <td data-label="Peran">
                      {staff.role === 'admin' ? (
                        <span className="badge bg-sky-100 text-sky-700">Admin Utama</span>
                      ) : (
                        <span className="badge bg-purple-100 text-purple-700">Sensei</span>
                      )}
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${staff.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                        {staff.active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td data-label="Aksi">
                      <button
                        type="button"
                        className="btn-danger !px-3 !py-2"
                        onClick={() => setDeleteDialog({ open: true, user: staff, submitting: false })}
                      >
                        <Trash2 size={16} />
                        <span className="md:hidden">Hapus</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={createModalOpen}
        onClose={() => !createSubmitting && setCreateModalOpen(false)}
        title="Buat Akun Staf"
        description="Pilih peran (role) untuk menentukan hak akses akun."
      >
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleCreateSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Peran (Role)</label>
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
              className="custom-field"
              required
            >
              <option value="sensei">Sensei (Terbatas)</option>
              <option value="admin">Admin Utama (Penuh)</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Email Login</label>
            <input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              className="custom-field"
              placeholder="sensei@example.com"
              required
              disabled={createSubmitting}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Password</label>
            <input
              type="text"
              value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              className="custom-field"
              placeholder="Minimal 6 karakter"
              required
              minLength={6}
              disabled={createSubmitting}
            />
          </div>

          {createError && <p className="field-note border-rose-200 bg-rose-50 text-rose-700">{createError}</p>}

          <div className="mt-2 flex justify-end gap-3">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCreateModalOpen(false)}
              disabled={createSubmitting}
            >
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={createSubmitting}>
              {createSubmitting ? 'Menyimpan...' : 'Buat Akun'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteDialog.open}
        title="Hapus Akun Staf"
        description={`Apakah Anda yakin ingin menghapus akun ${deleteDialog.user?.email}? Akun tidak bisa dipulihkan.`}
        confirmText="Hapus Akun"
        onConfirm={handleDeleteConfirm}
        onCancel={() => !deleteDialog.submitting && setDeleteDialog({ open: false, user: null, submitting: false })}
        submitting={deleteDialog.submitting}
        danger
      />
    </SectionCard>
  );
}
