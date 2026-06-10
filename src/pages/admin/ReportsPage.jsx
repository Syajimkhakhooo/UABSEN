import { useEffect, useState } from 'react';
import CustomSelect from '../../components/CustomSelect';
import DatePicker from '../../components/DatePicker';
import SectionCard from '../../components/SectionCard';
import { ATTENDANCE_TYPES } from '../../lib/constants';
import { listAttendance, logAudit, listStudents, listClasses } from '../../lib/uabsenApi';
import { exportAttendanceCsv, exportAttendancePdf } from '../../utils/export';
import { formatDate } from '../../utils/format';

export default function ReportsPage() {
  const [filters, setFilters] = useState({
    studentId: '',
    classId: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  });
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [records, setRecords] = useState([]);

  const studentOptions = [{ value: '', label: 'Semua siswa' }, ...students.map((student) => ({ value: student.id, label: student.name }))];
  const classOptions = [{ value: '', label: 'Semua kelas' }, ...classes.map((cls) => ({ value: cls.id, label: cls.name }))];
  const statusOptions = [{ value: '', label: 'Semua status' }, ...ATTENDANCE_TYPES.map((item) => ({ value: item.value, label: item.label }))];

  useEffect(() => {
    async function load() {
      const [attendanceData, studentData, classData] = await Promise.all([
        listAttendance(filters),
        listStudents(),
        listClasses(),
      ]);
      setRecords(attendanceData);
      setStudents(studentData);
      setClasses(classData);
    }

    load();
  }, [filters.studentId, filters.classId, filters.status, filters.dateFrom, filters.dateTo]);

  async function handleExport(type) {
    if (type === 'csv') {
      exportAttendanceCsv(records, 'uabsen-report.csv');
    } else {
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

      exportAttendancePdf(records, 'app-report.pdf', { title, periodText });
    }

    await logAudit('report_export', 'Admin mengekspor laporan absensi.', {
      type,
      total_records: records.length,
    });
  }

  return (
    <SectionCard
      title="Laporan Absensi"
      description="Gunakan filter di bawah ini sebelum mengekspor PDF atau CSV."
    >
      <div className="grid gap-3 md:grid-cols-5">
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

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button type="button" className="btn-secondary w-full sm:w-auto" onClick={() => handleExport('csv')}>
          Export CSV
        </button>
        <button type="button" className="btn-primary w-full sm:w-auto" onClick={() => handleExport('pdf')}>
          Export PDF
        </button>
      </div>

      <div className="surface-subtle mt-6 p-4 md:p-5">
        <p className="text-sm text-slate-500">Total record sesuai filter</p>
        <p className="mt-2 text-4xl font-extrabold text-primary">{records.length}</p>
      </div>
    </SectionCard>
  );
}
