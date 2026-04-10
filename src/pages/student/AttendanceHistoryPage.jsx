import { useEffect, useState } from 'react';
import DatePicker from '../../components/DatePicker';
import EmptyState from '../../components/EmptyState';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { listAttendance, logAudit } from '../../lib/uabsenApi';
import { exportAttendanceCsv, exportAttendancePdf } from '../../utils/export';
import { formatDate, formatDateTime } from '../../utils/format';

export default function AttendanceHistoryPage() {
  const { profile } = useAuth();
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
  });
  const [records, setRecords] = useState([]);

  if (!profile?.student_id) {
    return (
      <SectionCard
        title="Riwayat Absensi"
        description="Riwayat absensi akan tersedia setelah admin menautkan akun ini ke data siswa."
      >
        <EmptyState
          title="Riwayat belum tersedia"
          description="Akun Anda sudah berrole student, tetapi belum memiliki tautan ke data siswa."
        />
      </SectionCard>
    );
  }

  useEffect(() => {
    async function load() {
      if (!profile?.student_id) return;
      const data = await listAttendance({
        studentId: profile.student_id,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });
      setRecords(data);
    }

    load();
  }, [filters.dateFrom, filters.dateTo, profile?.student_id]);

  async function handleExport(type) {
    if (type === 'csv') {
      exportAttendanceCsv(records, 'riwayat-absensi-saya.csv');
    } else {
      exportAttendancePdf(records, 'riwayat-absensi-saya.pdf', 'Riwayat Absensi Saya');
    }

    await logAudit('report_export', 'Siswa mengunduh riwayat absensi pribadi.', {
      type,
      total_records: records.length,
    });
  }

  return (
    <SectionCard
      title="Riwayat Absensi"
      description="Siswa hanya dapat melihat dan mengunduh riwayat absensinya sendiri."
      actions={
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => handleExport('csv')}>
            Download CSV
          </button>
          <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => handleExport('pdf')}>
            Download PDF
          </button>
        </div>
      }
    >
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <DatePicker
          value={filters.dateFrom}
          onChange={(nextValue) => setFilters((value) => ({ ...value, dateFrom: nextValue }))}
        />
        <DatePicker
          value={filters.dateTo}
          onChange={(nextValue) => setFilters((value) => ({ ...value, dateTo: nextValue }))}
        />
      </div>

      {records.length ? (
        <div className="table-shell">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Status</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-t border-slate-100">
                  <td data-label="Tanggal">{formatDate(record.attendance_date)}</td>
                  <td data-label="Status">
                    <StatusBadge status={record.attendance_status} />
                  </td>
                  <td data-label="Check In">{formatDateTime(record.check_in_at)}</td>
                  <td data-label="Check Out">{formatDateTime(record.check_out_at)}</td>
                  <td data-label="Catatan">{record.correction_note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Belum ada riwayat" description="Data absensi pribadi akan muncul di halaman ini." />
      )}
    </SectionCard>
  );
}
