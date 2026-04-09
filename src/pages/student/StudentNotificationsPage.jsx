import SectionCard from '../../components/SectionCard';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications } from '../../hooks/useNotifications';
import { formatDateTime } from '../../utils/format';

export default function StudentNotificationsPage() {
  const { profile } = useAuth();
  const { notifications, readAll, readOne } = useNotifications(profile?.auth_user_id);

  return (
    <SectionCard
      title="Notifikasi"
      description="Notifikasi absensi, izin/sakit, koreksi, dan pengumuman admin akan tampil di sini."
      actions={
        <button type="button" className="btn-secondary" onClick={readAll}>
          Tandai Semua Dibaca
        </button>
      }
    >
      {notifications.length ? (
        <div className="grid gap-3">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => readOne(notification.id)}
              className={[
                'rounded-xl border p-4 text-left',
                notification.is_read ? 'border-slate-200 bg-white' : 'border-sky-100 bg-sky-50',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink">{notification.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                </div>
                {!notification.is_read && <span className="badge bg-accent/10 text-accent">Baru</span>}
              </div>
              <p className="mt-3 text-xs text-slate-400">{formatDateTime(notification.created_at)}</p>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="Belum ada notifikasi" description="Notifikasi personal akan tampil di halaman ini." />
      )}
    </SectionCard>
  );
}
