import { Bell, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { formatDateTime } from '../utils/format';
import Modal from './Modal';

export default function NotificationDropdown() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, readAll, readOne } = useNotifications(
    profile?.auth_user_id,
    profile?.role,
  );

  const [selectedNotification, setSelectedNotification] = useState(null);

  const targetPath = profile?.role === 'admin' ? '/admin/notifications' : '/student/notifications';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-primary"
        aria-label="Buka notifikasi"
      >
        <div className="relative">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="absolute -right-[84px] sm:right-0 top-11 z-50 w-[calc(100vw-2rem)] max-w-[340px] sm:w-[340px] rounded-[16px] border border-slate-200/80 bg-white p-4 shadow-[0_24px_48px_-36px_rgba(15,23,42,0.35)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-ink">Notifikasi</p>
              <p className="text-xs text-slate-500">{unreadCount} belum dibaca</p>
            </div>
            <button type="button" onClick={readAll} className="text-xs font-semibold text-primary">
              <CheckCheck size={14} className="mr-1 inline" />
              Tandai semua
            </button>
          </div>

          <div className="grid max-h-80 gap-3 overflow-y-auto">
            {notifications.slice(0, 6).map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => {
                  readOne(notification.id);
                  setSelectedNotification(notification);
                  setOpen(false); // Close dropdown when opening modal
                }}
                className={[
                  'rounded-xl border px-3 py-3 text-left transition-colors hover:border-slate-300',
                  notification.is_read ? 'border-slate-200 bg-slate-50' : 'border-sky-100 bg-sky-50',
                ].join(' ')}
              >
                <p className="text-sm font-semibold text-ink line-clamp-1">{notification.title}</p>
                <p className="mt-1 text-xs text-slate-600 line-clamp-2">{notification.message}</p>
                <p className="mt-2 text-[11px] text-slate-400">{formatDateTime(notification.created_at)}</p>
              </button>
            ))}

            {!notifications.length && <p className="text-sm text-slate-500">Belum ada notifikasi.</p>}
          </div>

          <Link to={targetPath} onClick={() => setOpen(false)} className="btn-primary mt-4 w-full">
            Buka Halaman Notifikasi
          </Link>
        </div>
      )}

      <Modal
        open={Boolean(selectedNotification)}
        onClose={() => setSelectedNotification(null)}
        title={selectedNotification?.title}
        description={selectedNotification ? formatDateTime(selectedNotification.created_at) : ''}
      >
        <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
          {selectedNotification?.message}
        </div>
        <div className="mt-6 flex justify-end">
          <button type="button" className="btn-primary" onClick={() => setSelectedNotification(null)}>
            Tutup
          </button>
        </div>
      </Modal>
    </div>
  );
}
