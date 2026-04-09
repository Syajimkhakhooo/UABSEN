import { ArrowRight, CircleUserRound } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import NotificationDropdown from './NotificationDropdown';
import { useAuth } from '../hooks/useAuth';

export default function Navbar({ title, mobile = false }) {
  const { profile, signOut, signingOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const profileTarget = profile?.role === 'student' ? '/student/profile' : '/admin/settings';
  const profileActionLabel = profile?.role === 'student' ? 'Buka Profil' : 'Buka Pengaturan';

  useEffect(() => {
    function handleOutsideClick(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className={mobile ? 'flex items-center justify-end gap-1' : 'flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between'}>
      <div className="hidden lg:block">
        <h2 className="text-lg font-bold leading-tight text-ink">{title}</h2>
        <p className="text-xs text-slate-500">
          {profile?.role === 'admin' ? 'Panel operasional admin' : 'Portal absensi siswa'}
        </p>
      </div>

      <div className={mobile ? 'flex items-center gap-1' : 'flex items-center justify-end gap-1.5'}>
        <NotificationDropdown />
        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((value) => !value)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary"
            aria-label="Buka profil"
            title="Buka profil"
          >
            <CircleUserRound size={19} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-9 z-40 w-[min(220px,calc(100vw-1rem))] rounded-[16px] border border-slate-200/80 bg-white/95 p-3 text-right shadow-[0_20px_45px_-34px_rgba(15,23,42,0.28)] backdrop-blur">
              <p className="truncate text-sm font-bold text-ink">
                {profile?.students?.name ?? profile?.auth_user_id?.slice(0, 8) ?? 'Pengguna'}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {profile?.role}
              </p>
              <Link
                to={profileTarget}
                onClick={() => setProfileOpen(false)}
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-sky-200 hover:text-primary"
              >
                {profileActionLabel}
              </Link>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary disabled:cursor-not-allowed disabled:opacity-70"
          disabled={signingOut}
          aria-label={signingOut ? 'Sedang keluar' : 'Keluar'}
          title={signingOut ? 'Sedang keluar' : 'Keluar'}
        >
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
