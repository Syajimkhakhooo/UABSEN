import { useEffect, useState } from 'react';
import CustomSelect from '../../components/CustomSelect';
import EmptyState from '../../components/EmptyState';
import SectionCard from '../../components/SectionCard';
import { useAuth } from '../../hooks/useAuth';
import { listNotifications, listStudents, logAudit, sendAnnouncement } from '../../lib/uabsenApi';
import { formatDateTime } from '../../utils/format';

const initialForm = {
  title: '',
  message: '',
  recipient_auth_user_id: '',
  broadcast: true,
};

export default function AdminNotificationsPage() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const studentOptions = [{ value: '', label: 'Pilih siswa tujuan' }, ...students.map((student) => ({ value: student.auth_user_id, label: student.name }))];

  async function loadData() {
    const [notificationData, studentData] = await Promise.all([
      // Filter berdasarkan recipient_auth_user_id admin yang sedang login
      // agar notifikasi pengajuan siswa (notifyAdmins) bisa ditampilkan
      listNotifications({ authUserId: profile?.auth_user_id }),
      listStudents(),
    ]);
    setNotifications(notificationData);
    setStudents(studentData.filter((student) => Boolean(student.auth_user_id)));
  }

  useEffect(() => {
    if (profile?.auth_user_id) {
      loadData();
    }
  }, [profile?.auth_user_id]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await sendAnnouncement(form);
      await logAudit('notification_create', 'Admin membuat notifikasi atau broadcast baru.', {
        broadcast: form.broadcast,
      });
      setForm(initialForm);
      await loadData();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <SectionCard
        title="Kirim Notifikasi"
        description="Broadcast akan dikirim ke semua siswa yang memiliki akun login. Target individual hanya ke satu siswa."
      >
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Judul</label>
            <input
              value={form.title}
              onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-600">Pesan</label>
            <textarea
              rows="5"
              value={form.message}
              onChange={(event) => setForm((value) => ({ ...value, message: event.target.value }))}
              required
            />
          </div>
          <label className="surface-subtle flex items-center gap-3 px-4 py-3 text-sm text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={form.broadcast}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  broadcast: event.target.checked,
                  recipient_auth_user_id: event.target.checked ? '' : value.recipient_auth_user_id,
                }))
              }
            />
            Kirim sebagai broadcast ke semua siswa
          </label>
          {!form.broadcast && (
            <CustomSelect
              value={form.recipient_auth_user_id}
              onChange={(nextValue) =>
                setForm((value) => ({ ...value, recipient_auth_user_id: nextValue }))
              }
              options={studentOptions}
              placeholder="Pilih siswa tujuan"
            />
          )}
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Mengirim...' : 'Kirim Notifikasi'}
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="Notifikasi Masuk"
        description="Pengajuan siswa dan notifikasi lain yang masuk ke admin"
      >
        {notifications.length ? (
          <div className="grid gap-3">
            {notifications.map((notification) => (
              <div key={notification.id} className="surface-subtle p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">{notification.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                  </div>
                  <span
                    className={[
                      'badge shrink-0',
                      notification.event_type === 'leave_request_submit'
                        ? 'bg-amber-100 text-amber-700'
                        : notification.event_type === 'attendance_late'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-sky-100 text-sky-700',
                    ].join(' ')}
                  >
                    {notification.event_type === 'leave_request_submit'
                      ? 'Pengajuan Siswa'
                      : notification.event_type === 'attendance_late'
                        ? 'Terlambat'
                        : notification.event_type === 'admin_announcement'
                          ? 'Pengumuman'
                          : 'Notifikasi'}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-400">{formatDateTime(notification.created_at)}</p>
                  {!notification.is_read && (
                    <span className="inline-flex h-2 w-2 rounded-full bg-primary" title="Belum dibaca" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Belum ada notifikasi masuk"
            description="Notifikasi pengajuan siswa akan muncul di sini secara otomatis."
          />
        )}
      </SectionCard>
    </div>
  );
}
