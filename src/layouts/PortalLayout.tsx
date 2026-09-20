import * as React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  NotificationBell,
  ROLE_LABELS,
  TierBadge,
  cn,
  initials,
  type SupplierTier,
} from '@/shared';
import { useAuth } from '@/stores/auth';
import { useNotifications } from '@/hooks/useNotifications';
import { navigationForRole } from './navigation';

export function PortalLayout() {
  const navigate = useNavigate();
  const { user, logout, isAuthenticated } = useAuth();
  const { notifications, unreadCount, loading, markRead, markAllRead } =
    useNotifications(isAuthenticated);

  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [accountOpen, setAccountOpen] = React.useState(false);

  const nav = navigationForRole(user?.role);
  const groups = Array.from(new Set(nav.map((item) => item.group)));

  return (
    <div className="min-h-screen lg:flex">
      {/* ---------------- Sidebar ---------------- */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white"
            aria-hidden="true"
          >
            UP
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">UsedPhoneDeals</p>
            <p className="truncate text-[11px] text-slate-500">
              {user ? ROLE_LABELS[user.role] : 'Portal'}
            </p>
          </div>
        </div>

        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group} className="mb-5 last:mb-0">
              {groups.length > 1 && (
                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {group}
                </p>
              )}
              <ul className="space-y-0.5">
                {nav
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.end}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-brand-50 text-brand-800'
                              : 'text-slate-700 hover:bg-slate-100',
                          )
                        }
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          className="h-5 w-5 shrink-0"
                          aria-hidden="true"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                        </svg>
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <p className="px-3 text-[11px] text-slate-400">
            Phase 1 · v1.0.0
          </p>
        </div>
      </aside>

      {/* ---------------- Main ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label="Toggle navigation"
            aria-expanded={sidebarOpen}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path strokeLinecap="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              loading={loading}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
              onNavigate={(href) => navigate(href)}
              emptyLabel="Nothing needs your attention"
            />

            <div className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                aria-expanded={accountOpen}
                aria-haspopup="true"
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-100"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                  {user ? initials(user.firstName, user.lastName) : '—'}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-medium leading-tight text-slate-900">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <span className="block text-[11px] leading-tight text-slate-500">
                    {user ? ROLE_LABELS[user.role] : ''}
                  </span>
                </span>
              </button>

              {accountOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setAccountOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    <p className="truncate border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
                      {user?.email}
                    </p>
                    {user?.role === 'SUPPLIER' && (
                      <NavLink
                        to="/supplier/settings"
                        onClick={() => setAccountOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Account settings
                      </NavLink>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        setAccountOpen(false);
                        await logout();
                        navigate('/login');
                      }}
                      className="block w-full border-t border-slate-100 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** Shared page header used by every screen in the portal. */
export function PageHeader({
  title,
  description,
  actions,
  tier,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  tier?: SupplierTier;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
            {tier && <TierBadge tier={tier} />}
          </div>
          {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
