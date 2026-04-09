import { Menu } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ADMIN_NAV_ITEMS, ROLE, STUDENT_NAV_ITEMS } from '../lib/constants';
import Navbar from './Navbar';

function Navigation({ items, mobile = false, collapsed = false, onNavigate }) {
  return (
    <nav className={mobile ? 'grid gap-2' : collapsed ? 'grid gap-0.5' : 'grid gap-1'}>
      {items.map((item) => {
        const Icon = item.icon;
        const exactMatch = item.to === '/admin' || item.to === '/student';
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={exactMatch}
            onClick={onNavigate}
            title={!mobile && collapsed ? item.label : undefined}
            className={({ isActive }) =>
              [
                mobile || !collapsed
                  ? 'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition'
                  : 'sidebar-icon-link',
                mobile || !collapsed
                  ? isActive
                    ? 'bg-sky-50 text-primary'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
                  : isActive
                    ? 'sidebar-icon-link-active'
                    : 'text-slate-500 hover:text-primary',
              ].join(' ')
            }
          >
            <Icon size={collapsed && !mobile ? 16 : 18} />
            {(!collapsed || mobile) && <span>{item.label}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}

export default function AppShell() {
  const { profile } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = useMemo(
    () => (profile?.role === ROLE.ADMIN ? ADMIN_NAV_ITEMS : STUDENT_NAV_ITEMS),
    [profile?.role],
  );

  const currentTitle = navItems.find((item) => item.to === location.pathname)?.label ?? 'Aplikasi';
  const sidebarWidthClass = sidebarCollapsed ? 'lg:pl-[84px]' : 'lg:pl-[280px]';

  useEffect(() => {
    const savedState = window.localStorage.getItem('uabsen.sidebar.collapsed');
    if (savedState) {
      setSidebarCollapsed(savedState === 'true');
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('uabsen.sidebar.collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className="min-h-screen pb-24 lg:pb-0">
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200/80 bg-white/88 backdrop-blur lg:flex lg:flex-col lg:overflow-hidden',
          sidebarCollapsed ? 'lg:w-[84px] lg:px-2 lg:pt-8 lg:pb-4' : 'lg:w-[280px] lg:px-6 lg:pt-10 lg:pb-6',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={() => setSidebarCollapsed((value) => !value)}
          className={[
            'w-full rounded-[16px] text-left transition hover:bg-slate-50 flex items-center',
            sidebarCollapsed ? 'justify-center px-2 py-2' : 'px-2 py-2.5 gap-3',
          ].join(' ')}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <img src="/logo.png" alt="UABSEN" className="h-8 w-8 shrink-0 object-contain" />
          {!sidebarCollapsed && (
            <span className="text-sm font-bold tracking-wide text-slate-800">
              UABSEN
            </span>
          )}
        </button>

        <div className={sidebarCollapsed ? 'mt-3' : 'mt-6'}>
          <Navigation items={navItems} collapsed={sidebarCollapsed} />
        </div>
      </aside>

      <div className={['transition-[padding] duration-300', sidebarWidthClass].join(' ')}>
        <div className="mx-auto min-h-screen max-w-[1600px]">
          <main className="min-w-0">
            <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/88 px-3 py-2 backdrop-blur md:px-6 lg:px-8">
              <div className="flex items-center justify-between gap-3 lg:hidden">
                <div className="flex min-w-0 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMobileOpen((value) => !value)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-primary"
                  >
                    <Menu size={17} />
                  </button>
                  <div className="min-w-0 flex items-center gap-2.5">
                    <img src="/logo.png" alt="UABSEN" className="h-7 w-7 shrink-0 object-contain" />
                    <h2 className="truncate text-sm font-semibold leading-tight text-ink">{currentTitle}</h2>
                  </div>
                </div>
                <Navbar title={currentTitle} mobile />
              </div>
              <div className="hidden lg:block pt-8">
                <Navbar title={currentTitle} />
              </div>
            </div>

            {mobileOpen && (
              <div className="border-b border-slate-200/70 bg-white/95 p-4 lg:hidden">
                <Navigation items={navItems} mobile onNavigate={() => setMobileOpen(false)} />
              </div>
            )}

            <div className="p-3.5 md:p-5 lg:px-6 lg:pt-8 lg:pb-6">
              <Outlet />
            </div>
          </main>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-white/92 px-2 py-2 backdrop-blur lg:hidden">
            <div className="grid grid-cols-5 gap-1">
              {navItems.slice(0, 5).map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={[
                      'flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-medium',
                      active ? 'bg-sky-50 text-primary' : 'text-slate-500',
                    ].join(' ')}
                  >
                    <Icon size={17} />
                    <span className="max-w-full truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
