import { LoaderCircle, MapPinned } from 'lucide-react';
import { useEffect, useState } from 'react';
import EmptyState from '../../components/EmptyState';
import SectionCard from '../../components/SectionCard';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { toUserMessage } from '../../lib/errorMessages';
import { getStudentDashboardData, logAudit, performAttendanceAction } from '../../lib/uabsenApi';
import { getCurrentPosition } from '../../utils/attendance';
import { formatDate, formatDateTime } from '../../utils/format';

export default function StudentDashboardPage() {
  const { profile } = useAuth();
  const [data, setData] = useState(null);
  const [submittingAction, setSubmittingAction] = useState('');
  const [message, setMessage] = useState('');

  function getAttendanceBlockMessage(action) {
    const todayAttendance = data?.todayAttendance;

    if (!todayAttendance) {
      return '';
    }

    if (['leave', 'sick'].includes(todayAttendance.attendance_status)) {
      return 'Absensi hari ini sudah ditandai sebagai izin/sakit. Hubungi admin jika memang perlu diubah.';
    }

    if (action === 'check_in' && todayAttendance.check_in_at) {
      return 'Check-in hari ini sudah tercatat.';
    }

    if (action === 'check_out' && !todayAttendance.check_in_at) {
      return 'Check-in belum tercatat untuk hari ini.';
    }

    if (action === 'check_out' && todayAttendance.check_out_at) {
      return 'Check-out hari ini sudah tercatat.';
    }

    return '';
  }

  async function loadDashboard() {
    if (!profile?.student_id) return;
    const result = await getStudentDashboardData(profile.student_id);
    setData(result);
  }

  useEffect(() => {
    loadDashboard();
  }, [profile?.student_id]);

  async function handleAttendance(action) {
    setSubmittingAction(action);
    setMessage('');

    try {
      const blockedMessage = getAttendanceBlockMessage(action);
      if (blockedMessage) {
        setMessage(blockedMessage);
        return;
      }

      const position = await getCurrentPosition();
      await performAttendanceAction(
        action,
        position.coords.latitude,
        position.coords.longitude,
        position.coords.accuracy,
      );
      await logAudit(
        action === 'check_in' ? 'attendance_check_in' : 'attendance_check_out',
        action === 'check_in' ? 'Siswa melakukan check-in.' : 'Siswa melakukan check-out.',
      );
      setMessage(action === 'check_in' ? 'Check-in berhasil diproses.' : 'Check-out berhasil diproses.');
      await loadDashboard();
    } catch (err) {
      setMessage(toUserMessage(err, 'Absensi gagal diproses. Coba lagi sebentar.'));
    } finally {
      setSubmittingAction('');
    }
  }

  if (!profile?.student_id) {
    return (
      <div className="grid gap-6">
        <section className="page-hero">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
            Dashboard Siswa
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-ink md:text-3xl">
            Akun Student Aktif
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Role student sudah aktif. Data siswa belum ditautkan oleh admin.
          </p>
        </section>

        <SectionCard
          title="Akun student belum ditautkan"
          description="Anda sudah bisa masuk ke aplikasi. Fitur inti akan aktif setelah admin menautkan `profiles.student_id` akun ini ke data siswa."
        >
          <EmptyState
            title="Menunggu tautan data siswa"
            description="Minta admin mengisi `profiles.student_id` untuk akun ini agar absensi, riwayat, dan pengajuan bisa dipakai."
          />
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="page-hero">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
          Dashboard Siswa
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-ink md:text-3xl">
          {profile?.students?.name}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Nomor induk {profile?.students?.student_number}
          <span className="hidden sm:inline"> | </span>
          <span className="block sm:inline">Program {profile?.students?.training_program || '-'}</span>
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard title="Absensi Hari Ini" description={`Tanggal ${formatDate(new Date())}`}>
          <div className="surface-subtle p-4 md:p-5">
            <div className="flex items-center gap-3 text-slate-500">
              <MapPinned size={18} />
              <p className="text-sm">Gunakan GPS aktif dan pastikan berada dalam radius lokasi absensi.</p>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleAttendance('check_in')}
                disabled={Boolean(submittingAction)}
              >
                {submittingAction === 'check_in' && <LoaderCircle size={16} className="animate-spin" />}
                Check In
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleAttendance('check_out')}
                disabled={Boolean(submittingAction)}
              >
                {submittingAction === 'check_out' && <LoaderCircle size={16} className="animate-spin" />}
                Check Out
              </button>
            </div>
            {message && <p className="field-note mt-4 border-slate-200 bg-white text-slate-600">{message}</p>}

            {data?.todayAttendance ? (
              <div className="mt-5 grid gap-3 rounded-[16px] border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-semibold text-slate-500">Status</span>
                  <StatusBadge status={data.todayAttendance.attendance_status} />
                </div>
                <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-slate-500">Check In</span>
                  <span className="font-semibold text-ink">{formatDateTime(data.todayAttendance.check_in_at)}</span>
                </div>
                <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-slate-500">Check Out</span>
                  <span className="font-semibold text-ink">{formatDateTime(data.todayAttendance.check_out_at)}</span>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  title="Belum ada absensi hari ini"
                  description="Gunakan tombol check-in ketika sudah berada di lokasi absensi."
                />
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Riwayat Terbaru" description="6 catatan absensi terakhir">
          {data?.recentHistory?.length ? (
            <div className="grid gap-3">
              {data.recentHistory.map((item) => (
                <div key={item.id} className="surface-subtle p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink">{formatDate(item.attendance_date)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        In {formatDateTime(item.check_in_at)} | Out {formatDateTime(item.check_out_at)}
                      </p>
                    </div>
                    <StatusBadge status={item.attendance_status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Riwayat belum tersedia" description="Absensi yang berhasil akan tampil di sini." />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
