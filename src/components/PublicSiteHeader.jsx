import { ArrowRight, Gem, Layers3, Menu, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const sectionItems = [
  { id: 'fitur', label: 'Fitur', icon: Sparkles },
  { id: 'alur', label: 'Alur', icon: Layers3 },
  { id: 'keunggulan', label: 'Keunggulan', icon: Gem },
];

function buildSectionHref(sectionBasePath, id) {
  return `${sectionBasePath}#${id}`;
}

export default function PublicSiteHeader({
  currentPath = '/',
  sectionBasePath = '',
  title = 'Sistem absensi siswa modern',
  sticky = true,
}) {
  const { profile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dashboardTarget = profile?.role === 'admin' ? '/admin' : '/student';
  const primaryCtaTarget = profile ? dashboardTarget : '/login';
  const primaryCtaLabel = profile ? 'Masuk ke Dashboard' : 'Masuk ke Aplikasi';

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.style.removeProperty('overflow');
      return undefined;
    }

    document.body.style.overflow = 'hidden';
    return () => document.body.style.removeProperty('overflow');
  }, [mobileMenuOpen]);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  function handleBrandClick(event) {
    closeMobileMenu();

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

        <nav className="hidden items-center gap-5 lg:flex xl:gap-6">
          {sectionItems.map((item) => (
            <a key={item.id} href={buildSectionHref(sectionBasePath, item.id)} className="landing-nav-link">
              <item.icon size={14} className="shrink-0 opacity-80" />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((value) => !value)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/92 text-slate-600 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.32)] hover:border-sky-200 hover:text-primary lg:hidden"
            aria-label={mobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link
            to={primaryCtaTarget}
            className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-primary transition hover:text-sky-700 sm:gap-2 sm:text-sm"
          >
            {primaryCtaLabel}
            <ArrowRight size={16} className="shrink-0 sm:h-[17px] sm:w-[17px]" />
          </Link>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-slate-200/70 bg-white/94 px-4 pb-4 pt-3 shadow-[0_22px_40px_-34px_rgba(15,23,42,0.26)] backdrop-blur-xl lg:hidden md:px-6">
          <div className="grid gap-2">
            {sectionItems.map((item) => (
              <a
                key={item.id}
                href={buildSectionHref(sectionBasePath, item.id)}
                className="landing-mobile-link"
                onClick={closeMobileMenu}
              >
                <item.icon size={16} className="shrink-0 opacity-80" />
                {item.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
