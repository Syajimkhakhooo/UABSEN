import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function PublicSiteHeader({
  currentPath = '/',
  sectionBasePath = '',
  title = 'Sistem absensi siswa modern',
  sticky = true,
}) {
  const { profile } = useAuth();
  const dashboardTarget = profile?.role === 'admin' ? '/admin' : '/student';
  const primaryCtaTarget = profile ? dashboardTarget : '/login';
  const primaryCtaLabel = profile ? 'Masuk ke Dashboard' : 'Masuk ke Aplikasi';

  function handleBrandClick(event) {

    if (currentPath !== '/') {
      return;
    }

    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <header
      className={[
        sticky ? 'fixed inset-x-0 top-0 z-40' : 'relative z-20',
        'border-b border-white/50 bg-white/74 shadow-[0_16px_36px_-30px_rgba(15,23,42,0.24)] backdrop-blur-xl',
      ].join(' ')}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link to="/" onClick={handleBrandClick} className="flex min-w-0 items-center gap-3">
          <img src="/logo.png" alt="UABSEN" className="h-10 w-10 shrink-0 object-contain" />
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold tracking-[0.2em] text-primary/80">UABSEN</p>
            <p className="hidden text-xs text-slate-500 sm:block">{title}</p>
          </div>
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            to={primaryCtaTarget}
            className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-primary transition hover:text-sky-700 sm:gap-2 sm:text-sm"
          >
            {primaryCtaLabel}
            <ArrowRight size={16} className="shrink-0 sm:h-[17px] sm:w-[17px]" />
          </Link>
        </div>
      </div>
    </header>
  );
}
