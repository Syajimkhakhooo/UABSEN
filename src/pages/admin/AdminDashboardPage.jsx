import { useEffect, useState } from 'react';
import EmptyState from '../../components/EmptyState';
import SectionCard from '../../components/SectionCard';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { toUserMessage } from '../../lib/errorMessages';
import { getAdminDashboardData } from '../../lib/uabsenApi';
import { formatDate, formatDateTime } from '../../utils/format';

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const result = await getAdminDashboardData();
        setData(result);
      } catch (err) {
        setError(toUserMessage(err, 'Dashboard admin belum bisa dimuat. Coba lagi sebentar.'));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return <div className="text-sm text-slate-500">Memuat dashboard admin...</div>;
  }

  if (error) {
    return <div className="field-note border-rose-200 bg-rose-50 text-rose-600">{error}</div>;
  }

  return (
    <div className="grid gap-6">
      <section className="page-hero">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
          Ringkasan Operasional
        </p>
        <h1 className="mt-3 max-w-3xl text-2xl font-semibold tracking-[-0.04em] text-ink md:text-3xl">Kontrol absensi siswa dari satu dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          Pantau jumlah siswa aktif, kehadiran hari ini, pengajuan izin/sakit, dan aktivitas audit
          terbaru tanpa keluar dari panel admin.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Siswa" value={data.stats.totalStudents} />
        <StatCard label="Siswa Aktif" value={data.stats.activeStudents} accent="text-emerald-600" />
        <StatCard label="Hadir Hari Ini" value={data.stats.presentCount} accent="text-sky-600" />
        <StatCard
          label="Pengajuan Menunggu"
          value={data.stats.pendingRequests}
          accent="text-amber-600"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Absensi Hari Ini" description={`Tanggal ${formatDate(new Date())}`}>
          {data.todayAttendance.length ? (
            <div className="table-shell">
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th>Siswa</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.todayAttendance.map((item) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td data-label="Siswa">
                        <div className="font-semibold text-ink">{item.students?.name}</div>
                        <div className="text-xs text-slate-500">{item.students?.student_number}</div>
                      </td>
                      <td data-label="Status">
                        <StatusBadge status={item.attendance_status} />
                      </td>
                      <td data-label="Tanggal">{formatDate(item.attendance_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Belum ada absensi hari ini"
              description="Data akan muncul setelah siswa melakukan absen masuk atau ada koreksi admin."
            />
          )}
        </SectionCard>

        <SectionCard title="Audit Log Terkini" description="Aktivitas penting sistem terbaru">
          {data.recentAudit.length ? (
            <div className="grid gap-3">
              {data.recentAudit.map((item) => (
                <div key={item.id} className="surface-subtle p-4">
                  <p className="text-sm font-semibold capitalize text-ink">
                    {item.action.replaceAll('_', ' ')}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                  <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Belum ada audit log"
              description="Audit log akan terbentuk otomatis ketika ada aktivitas penting."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
