import { Link } from 'react-router-dom';
import { Button } from '@/shared';
import { useAuth } from '@/stores/auth';
import { landingPathForRole } from '@/layouts/navigation';

export function NotFoundPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">404</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Page not found</h1>
        <p className="mt-3 text-sm text-slate-600">
          That page does not exist, or you followed a link that is now out of date.
        </p>
        <Link to={landingPathForRole(user?.role)} className="mt-6 inline-block">
          <Button>Back to my dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
