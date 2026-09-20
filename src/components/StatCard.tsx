import { cn } from '@/shared';

/** KPI tile used across all three dashboards. */
export function StatCard({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
  href,
  onClick,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger';
  icon?: string;
  href?: string;
  onClick?: () => void;
}) {
  const interactive = Boolean(href || onClick);
  const Element = href ? 'a' : onClick ? 'button' : 'div';

  return (
    <Element
      {...(href ? { href } : {})}
      {...(onClick ? { onClick, type: 'button' as const } : {})}
      className={cn(
        'block rounded-xl border border-slate-200 bg-white p-4 text-left',
        interactive && 'transition-shadow hover:border-slate-300 hover:shadow-sm',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-slate-600">{label}</p>
        {icon && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className={cn(
              'h-5 w-5 shrink-0',
              tone === 'positive' && 'text-emerald-600',
              tone === 'warning' && 'text-amber-600',
              tone === 'danger' && 'text-red-600',
              tone === 'neutral' && 'text-slate-400',
            )}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        )}
      </div>
      <p
        className={cn(
          'mt-1.5 text-2xl font-bold',
          tone === 'danger' ? 'text-red-700' : tone === 'warning' ? 'text-amber-700' : 'text-slate-900',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </Element>
  );
}
