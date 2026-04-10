import { useEffect, useState } from 'react';
import CustomSelect from '../../components/CustomSelect';
import Modal from '../../components/Modal';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import { listLeaveRequests, logAudit, reviewLeaveRequest } from '../../lib/uabsenApi';
import { formatDate, formatDateTime } from '../../utils/format';

const initialReviewState = {
  id: '',
  review_status: 'approved',
  review_note: '',
};

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [review, setReview] = useState(initialReviewState);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const reviewOptions = [
    { value: 'approved', label: 'Setujui' },
    { value: 'rejected', label: 'Tolak' },
  ];

  async function loadData() {
    const data = await listLeaveRequests();
    setRequests(data);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleReviewSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await reviewLeaveRequest(review);
      await logAudit('leave_request_review', 'Admin meninjau pengajuan izin/sakit.', {
        leave_request_id: review.id,
        decision: review.review_status,
      });
      setModalOpen(false);
      setReview(initialReviewState);
      await loadData();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SectionCard
      title="Pengajuan Izin & Sakit"
      description="Admin meninjau, menyetujui, atau menolak permohonan siswa sesuai dokumen pendukung operasional."
    >
      <div className="table-shell">
        <table className="responsive-table">
          <thead>
            <tr>
              <th>Siswa</th>
              <th>Jenis</th>
              <th>Rentang</th>
              <th>Alasan</th>
              <th>Status</th>
              <th>Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} className="border-t border-slate-100">
                <td data-label="Siswa">
                  <div className="font-semibold text-ink">{request.students?.name}</div>
                  <div className="text-xs text-slate-500">{request.students?.student_number}</div>
                </td>
                <td data-label="Jenis" className="capitalize">{request.request_type === 'leave' ? 'Izin' : 'Sakit'}</td>
                <td data-label="Rentang">
                  {formatDate(request.start_date)}
                  <div className="text-xs text-slate-500">s.d. {formatDate(request.end_date)}</div>
                </td>
                <td data-label="Alasan" className="max-w-xs whitespace-normal">{request.reason}</td>
                <td data-label="Status">
                  <StatusBadge status={request.review_status} type="request" />
                </td>
                <td data-label="Dibuat">{formatDateTime(request.created_at)}</td>
                <td data-label="Aksi">
                  <button
                    type="button"
                    className="btn-secondary !px-3 !py-2"
                    onClick={() => {
                      setReview({
                        id: request.id,
                        review_status: 'approved',
                        review_note: request.review_note ?? '',
                      });
                      setModalOpen(true);
                    }}
                  >
                    Tinjau
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Review Pengajuan"
        description="Status yang dipilih akan memengaruhi laporan absensi dan notifikasi siswa."
      >
        <form className="grid gap-4" onSubmit={handleReviewSubmit}>
          <CustomSelect
            value={review.review_status}
            onChange={(nextValue) => setReview((value) => ({ ...value, review_status: nextValue }))}
            options={reviewOptions}
          />
          <textarea
            rows="4"
            placeholder="Catatan review"
            value={review.review_note}
            onChange={(event) => setReview((value) => ({ ...value, review_note: event.target.value }))}
          />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => setModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
              {submitting ? 'Memproses...' : 'Simpan Keputusan'}
            </button>
          </div>
        </form>
      </Modal>
    </SectionCard>
  );
}
