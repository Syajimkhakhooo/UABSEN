import { useEffect, useMemo, useState } from 'react';
import CustomSelect from '../../components/CustomSelect';
import DatePicker from '../../components/DatePicker';
import DateTimeField from '../../components/DateTimeField';
import Modal from '../../components/Modal';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import { ATTENDANCE_TYPES } from '../../lib/constants';
import { listAttendance, listStudents, logAudit, manualCorrectAttendance, listClasses } from '../../lib/uabsenApi';
import { exportAttendanceCsv, exportAttendancePdf } from '../../utils/export';
import { formatDate, formatDateTime } from '../../utils/format';

const correctionInitialState = {
  attendance_id: '',
  attendance_status: 'corrected',
  check_in_at: '',
  check_out_at: '',
  correction_note: '',
};

export default function AttendanceDataPage() {
  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({
    studentId: '',
    classId: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });
  const [correction, setCorrection] = useState(correctionInitialState);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const studentOptions = useMemo(
    () => [{ value: '', label: 'Semua siswa' }, ...students.map((student) => ({ value: student.id, label: student.name }))],
    [students],
  );

  const classOptions = useMemo(
    () => [{ value: '', label: 'Semua kelas' }, ...classes.map((cls) => ({ value: cls.id, label: cls.name }))],
    [classes],
  );

  const statusOptions = useMemo(
    () => [{ value: '', label: 'Semua status' }, ...ATTENDANCE_TYPES.map((status) => ({ value: status.value, label: status.label }))],
    [],
  );

  const correctionStatusOptions = useMemo(
    () => ATTENDANCE_TYPES.map((status) => ({ value: status.value, label: status.label })),
    [],
  );

  async function loadData() {
    const [attendanceData, studentData, classData] = await Promise.all([
      listAttendance(filters),
      listStudents(),
      listClasses(),
    ]);
    setRecords(attendanceData);
    setStudents(studentData);
    setClasses(classData);
  }

  useEffect(() => {
    loadData();
  }, [filters.studentId, filters.classId, filters.status, filters.dateFrom, filters.dateTo]);

  const summary = useMemo(
    () => ({
      total: records.length,
      corrected: records.filter((item) => item.attendance_status === 'corrected').length,
      present: records.filter((item) => ['present', 'late'].includes(item.attendance_status)).length,
    }),
    [records],
  );

  async function handleCorrectionSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await manualCorrectAttendance(correction);
      await logAudit('attendance_manual_correction', 'Admin melakukan koreksi absensi manual.', {
        attendance_id: correction.attendance_id,
      });
      setModalOpen(false);
      setCorrection(correctionInitialState);
      await loadData();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <SectionCard title="Total Record">
          <p className="text-3xl font-extrabold text-primary">{summary.total}</p>
        </SectionCard>
        <SectionCard title="Hadir / Terlambat">
          <p className="text-3xl font-extrabold text-emerald-600">{summary.present}</p>
        </SectionCard>
        <SectionCard title="Dikoreksi">
          <p className="text-3xl font-extrabold text-fuchsia-600">{summary.corrected}</p>
        </SectionCard>
      </div>

      <SectionCard
        title="Data Absensi"
        description="Filter per tanggal, rentang waktu, siswa, dan status. Koreksi manual selalu dicatat di audit log."
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => exportAttendanceCsv(records)}>
              Export CSV
            </button>
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              onClick={() => {
                let periodText = 'PERIODE BULAN ....';
                if (filters.dateFrom && filters.dateTo) {
                  if (filters.dateFrom === filters.dateTo) {
                    periodText = `TANGGAL ${formatDate(filters.dateFrom).toUpperCase()}`;
                  } else {
                    periodText = `PERIODE ${formatDate(filters.dateFrom).toUpperCase()} - ${formatDate(filters.dateTo).toUpperCase()}`;
                  }
                } else if (filters.dateFrom) {
                  periodText = `MULAI TANGGAL ${formatDate(filters.dateFrom).toUpperCase()}`;
                } else if (filters.dateTo) {
                  periodText = `SAMPAI TANGGAL ${formatDate(filters.dateTo).toUpperCase()}`;
                } else {
                  periodText = 'KESELURUHAN WAKTU';
                }

                let title = 'REKAPITULASI ABSENSI SISWA';
                if (filters.classId) {
                  const cls = classes.find((c) => c.id === filters.classId);
                  if (cls) {
                    title = `REKAPITULASI ABSENSI SISWA - KELAS ${cls.name.toUpperCase()}`;
                  }
                }

                if (filters.studentId) {
                  const student = students.find((s) => s.id === filters.studentId);
                  if (student) {
                    title = `REKAPITULASI ABSENSI - ${student.name.toUpperCase()}`;
                  }
                }

                exportAttendancePdf(records, 'data-absensi.pdf', { title, periodText });
              }}
            >
              Export PDF
            </button>
          </div>
        }
      >
        <div className="mb-4 grid gap-3 md:grid-cols-5">
          <CustomSelect
            value={filters.classId}
            onChange={(nextValue) => setFilters((value) => ({ ...value, classId: nextValue }))}
            options={classOptions}
            placeholder="Semua kelas"
          />
          <CustomSelect
            value={filters.studentId}
            onChange={(nextValue) => setFilters((value) => ({ ...value, studentId: nextValue }))}
            options={studentOptions}
            placeholder="Semua siswa"
          />
          <CustomSelect
            value={filters.status}
            onChange={(nextValue) => setFilters((value) => ({ ...value, status: nextValue }))}
            options={statusOptions}
            placeholder="Semua status"
          />
          <DatePicker
            value={filters.dateFrom}
            onChange={(nextValue) => setFilters((value) => ({ ...value, dateFrom: nextValue }))}
          />
          <DatePicker
            value={filters.dateTo}
            onChange={(nextValue) => setFilters((value) => ({ ...value, dateTo: nextValue }))}
            popoverAlign="right"
          />
        </div>

        <div className="table-shell">
          <table className="responsive-table">
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Tanggal</th>
                <th>Status</th>
                <th>Absen Masuk</th>
                <th>Absen Keluar</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-t border-slate-100">
                  <td data-label="Siswa">
                    <div className="font-semibold text-ink">{record.students?.name}</div>
                    <div className="text-xs text-slate-500">{record.students?.student_number}</div>
                  </td>
                  <td data-label="Tanggal">{formatDate(record.attendance_date)}</td>
                  <td data-label="Status">
                    <StatusBadge status={record.attendance_status} />
                  </td>
                  <td data-label="Absen Masuk">{formatDateTime(record.check_in_at)}</td>
                  <td data-label="Absen Keluar">{formatDateTime(record.check_out_at)}</td>
                  <td data-label="Aksi">
                    <button
                      type="button"
                      className="btn-secondary !px-3 !py-2"
                      onClick={() => {
                        setCorrection({
                          attendance_id: record.id,
                          attendance_status: record.attendance_status,
                          check_in_at: record.check_in_at ? record.check_in_at.slice(0, 16) : '',
                          check_out_at: record.check_out_at ? record.check_out_at.slice(0, 16) : '',
                          correction_note: record.correction_note ?? '',
                        });
                        setModalOpen(true);
                      }}
                    >
                      Koreksi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Koreksi Absensi"
        description="Gunakan hanya untuk penyesuaian operasional yang sah. Semua perubahan akan dilog."
      >
        <form className="grid gap-4" onSubmit={handleCorrectionSubmit}>
          <CustomSelect
            value={correction.attendance_status}
            onChange={(nextValue) => setCorrection((value) => ({ ...value, attendance_status: nextValue }))}
            options={correctionStatusOptions}
          />
          <div className="grid gap-4 md:grid-cols-2">
            <DateTimeField
              value={correction.check_in_at}
              onChange={(nextValue) => setCorrection((value) => ({ ...value, check_in_at: nextValue }))}
              datePlaceholder="Tanggal absen masuk"
            />
            <DateTimeField
              value={correction.check_out_at}
              onChange={(nextValue) => setCorrection((value) => ({ ...value, check_out_at: nextValue }))}
              datePlaceholder="Tanggal absen keluar"
            />
          </div>
          <textarea
            rows="4"
            placeholder="Catatan koreksi"
            value={correction.correction_note}
            onChange={(event) =>
              setCorrection((value) => ({ ...value, correction_note: event.target.value }))
            }
            required
          />
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => setModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Koreksi'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
