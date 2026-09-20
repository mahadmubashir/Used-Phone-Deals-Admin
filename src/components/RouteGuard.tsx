import { Navigate, useLocation } from 'react-router-dom';
import { LoadingState, ROLE_LABELS, type PortalSection } from '@/shared';
import { useAuth } from '@/stores/auth';

/**
 * Route-level permission enforcement.
 *
 * This is the layer that keeps a CSR agent out of catalogue management,
 * supplier accounts, financial reporting, commission settings and platform
 * configuration — not merely hiding the nav link. A CSR who types
 * /admin/settings directly lands on the Access Denied screen below.
 *
 * The API enforces the same rules independently; this exists so the UI fails
 * clearly rather than rendering a shell full of 403s.
 */
export function RouteGuard({
  section,
  children,
}: {
  section: PortalSection;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const { loading, isAuthenticated, sessionEstablished, can, user } = useAuth();

  if (loading) return <LoadingState label="Checking your access…" className="min-h-[60vh]" />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // A supplier who has authenticated but not yet cleared MFA has no session.
  if (!sessionEstablished) {
    return <Navigate to="/login" state={{ from: location.pathname, mfa: true }} replace />;
  }

  if (!can(section)) return <AccessDenied section={section} role={user?.role} />;

  return <>{children}</>;
}

function AccessDenied({ section, role }: { section: PortalSection; role?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6 text-amber-700">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </span>

        <h1 className="mt-5 text-lg font-semibold text-slate-900">You don&apos;t have access to this</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your role
          {role ? (
            <>
              {' '}
              (<span className="font-medium">{ROLE_LABELS[role as keyof typeof ROLE_LABELS]}</span>)
            </>
          ) : null}{' '}
          does not include the <span className="font-mono text-xs">{section}</span> area. If you
          believe this is wrong, contact the Super Admin.
        </p>

        <a
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white hover:bg-brand-700"
        >
          Back to my dashboard
        </a>
      </div>
    </div>
  );
}
