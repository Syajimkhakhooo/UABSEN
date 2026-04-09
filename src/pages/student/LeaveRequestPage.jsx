import { useEffect, useState } from 'react';
import CustomSelect from '../../components/CustomSelect';
import DatePicker from '../../components/DatePicker';
import EmptyState from '../../components/EmptyState';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import { LEAVE_TYPE_OPTIONS } from '../../lib/constants';
import { useAuth } from '../../hooks/useAuth';
import { listLeaveRequests, logAudit, notifyAdmins, submitLeaveRequest } from '../../lib/uabsenApi';
import { formatDate, formatDateTime } from '../../utils/format';

const initialForm = {
  request_type: 'leave',
  start_date: '',
  end_date: '',
  reason: '',
};

export default function LeaveRequestPage() {
  const { profile } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [requests, setRequests] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const leaveTypeOptions = LEAVE_TYPE_OPTIONS.map((option) => ({ value: option.value, label: option.label }));

  if (!profile?.student_id) {
    return (
      <SectionCard
        title="Ajukan Izin / Sakit"
        description="Fitur pengajuan akan aktif setelah akun student ini ditautkan ke data siswa."
      >
        <EmptyState
          title="Pengajuan belum tersedia"
          description="Minta admin menautkan akun Anda ke data siswa terlebih dahulu."
        />
      </SectionCard>
    );
  }

  async function loadData() {
    if (!profile?.student_id) return;
    const data = await listLeaveRequests({ studentId: profile.student_id });
    setRequests(data);
  }

  useEffect(() => {
    loadData();
  }, [profile?.student_id]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.start_date || !form.end_date) {
      setError('Tanggal mulai dan tanggal selesai wajib diisi.');
      return;
    }

    if (form.end_date < form.start_date) {
      setError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    setSubmitting(true);

    try {
      const createdRequest = await submitLeaveRequest({
        request_type: form.request_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
      });
      await logAudit('leave_request_submit', 'Siswa mengirim pengajuan izin/sakit.', {
        request_type: form.request_type,
      });

      // Kirim notifikasi ke admin — fire and forget
      const jenisLabel = form.request_type === 'leave' ? 'Izin' : 'Sakit';
      const studentName = profile?.students?.name ?? 'Siswa';
      notifyAdmins(
        `Pengajuan ${jenisLabel} Baru`,
        `${studentName} mengajukan ${jenisLabel.toLowerCase()} mulai ${form.start_date} s.d. ${form.end_date}. Alasan: ${form.reason.slice(0, 80)}${form.reason.length > 80 ? '...' : ''}`,
        'leave_request_submit',
      ).catch(() => {});

      setForm(initialForm);
      setRequests((current) => [
        {
          ...(Array.isArray(createdRequest) ? createdRequest[0] : createdRequest),
          students: {
            name: profile?.students?.name,
            student_number: profile?.students?.student_number,
          },
        },
        ...current,
      ]);
      loadData().catch(() => {});
    } catch (err) {
      setError(err.message ?? 'Pengajuan gagal dikirim.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <SectionCard title="Ajukan Izin / Sakit" description="Pilih jenis pengajuan, rentang tanggal, dan alasan.">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          {error && <p className="field-note border-rose-200 bg-rose-50 text-rose-600">{error}</p>}
          <CustomSelect
            value={form.request_type}
            onChange={(nextValue) => setForm((value) => ({ ...value, request_type: nextValue }))}
            options={leaveTypeOptions}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <DatePicker
              value={form.start_date}
              onChange={(nextValue) => setForm((value) => ({ ...value, start_date: nextValue }))}
              placeholder="Tanggal mulai"
            />
            <DatePicker
              value={form.end_date}
              onChange={(nextValue) => setForm((value) => ({ ...value, end_date: nextValue }))}
              placeholder="Tanggal selesai"
              min={form.start_date || undefined}
            />
          </div>
          <textarea
            rows="5"
            placeholder="Tulis alasan pengajuan"
            value={form.reason}
            onChange={(event) => setForm((value) => ({ ...value, reason: event.target.value }))}
            required
          />
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Riwayat Pengajuan" description="Status akan diperbarui setelah ditinjau admin.">
        {requests.length ? (
          <div className="grid gap-3">
            {requests.map((request) => (
              <div key={request.id} className="surface-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink capitalize">
                      {request.request_type === 'leave' ? 'Izin' : 'Sakit'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(request.start_date)} s.d. {formatDate(request.end_date)}
                    </p>
                    <p className="mt-3 text-sm text-slate-600">{request.reason}</p>
                    <p className="mt-2 text-xs text-slate-400">{formatDateTime(request.created_at)}</p>
                  </div>
                  <StatusBadge status={request.review_status} type="request" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Belum ada pengajuan"
            description="Pengajuan izin atau sakit yang Anda kirim akan muncul di sini."
          />
        )}
      </SectionCard>
    </div>
  );
}
