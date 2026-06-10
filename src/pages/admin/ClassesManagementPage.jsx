import { useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import ConfirmDialog from '../../components/ConfirmDialog';
import Modal from '../../components/Modal';
import SectionCard from '../../components/SectionCard';
import { createClass, deleteClass, listClasses, updateClass, logAudit } from '../../lib/uabsenApi';

export default function ClassesManagementPage() {
  const [classes, setClasses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);

  async function loadData() {
    const data = await listClasses();
    setClasses(data);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (formData.id) {
        await updateClass(formData);
        await logAudit('class_update', 'Admin memperbarui kelas.', { class_id: formData.id, name: formData.name });
      } else {
        const newClass = await createClass(formData);
        await logAudit('class_create', 'Admin membuat kelas baru.', { class_id: newClass.id, name: formData.name });
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err.message || 'Gagal menyimpan kelas.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selectedClass) return;
    try {
      await deleteClass(selectedClass.id);
      await logAudit('class_delete', 'Admin menghapus kelas.', { class_id: selectedClass.id, name: selectedClass.name });
      setConfirmOpen(false);
      await loadData();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <SectionCard
      title="Pengaturan Kelas (Bilik)"
      description="Kelola daftar kelas untuk mempermudah pencetakan rekapitulasi absensi per kelas."
      actions={
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setFormData({ id: '', name: '' });
            setModalOpen(true);
          }}
        >
          Tambah Kelas
        </button>
      }
    >
      <div className="table-shell mt-4">
        <table className="responsive-table">
          <thead>
            <tr>
              <th>Nama Kelas / Bilik</th>
              <th className="w-24">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((cls) => (
              <tr key={cls.id} className="border-t border-slate-100">
                <td data-label="Nama Kelas">{cls.name}</td>
                <td data-label="Aksi">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn-secondary !p-2"
                      title="Edit kelas"
                      onClick={() => {
                        setFormData({ id: cls.id, name: cls.name });
                        setModalOpen(true);
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-danger !p-2"
                      title="Hapus kelas"
                      onClick={() => {
                        setSelectedClass(cls);
                        setConfirmOpen(true);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {classes.length === 0 && (
              <tr>
                <td colSpan={2} className="p-4 text-center text-sm text-slate-500">
                  Belum ada kelas yang ditambahkan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={formData.id ? 'Edit Kelas' : 'Tambah Kelas'}
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          {error && <p className="field-note border-rose-200 bg-rose-50 text-rose-600">{error}</p>}
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Nama Kelas</label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="Misal: Kelas A"
              value={formData.name}
              onChange={(e) => setFormData((v) => ({ ...v, name: e.target.value }))}
            />
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => setModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title="Hapus Kelas"
        description={`Apakah Anda yakin ingin menghapus kelas "${selectedClass?.name}"? Siswa yang ada di kelas ini akan kembali menjadi 'Belum ada kelas'.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
        confirmLabel="Hapus Kelas"
        danger
      />
    </SectionCard>
  );
}
