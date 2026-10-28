import * as React from 'react';
import { cn } from '../lib/cn';
import { formatRelative } from '../lib/format';
import { Spinner } from './primitives';
import type { AppNotification } from '../types';

/**
 * In-app notification centre. Shared by all four audiences — buyers,
 * suppliers, CSR agents and admins — with the data supplied by the host app.
 */
export interface NotificationBellProps {
  notifications: AppNotification[];
  unreadCount: number;
  loading?: boolean;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onOpen?: () => void;
  /** Host app supplies navigation — Next.js router or react-router. */
  onNavigate?: (href: string) => void;
  emptyLabel?: string;
  className?: string;
}

const SEVERITY_DOTS: Record<AppNotification['severity'], string> = {
  INFO: 'bg-sky-500',
  SUCCESS: 'bg-emerald-500',
  WARNING: 'bg-amber-500',
  ERROR: 'bg-red-500',
};

export function NotificationBell({
  notifications,
  unreadCount,
  loading,
  onMarkRead,
  onMarkAllRead,
  onOpen,
  onNavigate,
  emptyLabel = 'No notifications yet',
  className,
}: NotificationBellProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) onOpen?.();
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={
          unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
        }
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner className="h-5 w-5 text-brand-600" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">{emptyLabel}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        if (!notification.read) onMarkRead(notification.id);
                        if (notification.href) {
                          onNavigate?.(notification.href);
                          setOpen(false);
                        }
                      }}
                      className={cn(
                        'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50',
                        !notification.read && 'bg-brand-50/50',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          notification.read ? 'bg-slate-300' : SEVERITY_DOTS[notification.severity],
                        )}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-slate-900">
                          {notification.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-600">{notification.body}</span>
                        <span className="mt-1 block text-[11px] text-slate-400">
                          {formatRelative(notification.createdAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
