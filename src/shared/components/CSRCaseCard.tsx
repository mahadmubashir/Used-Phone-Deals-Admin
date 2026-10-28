import { cn } from '../lib/cn';
import { formatRelative, formatCountdown, truncate } from '../lib/format';
import { CASE_TYPE_LABELS } from '../constants';
import { CaseStatusBadge, StatusBadge } from './badges';
import type { CSRCase } from '../types';

export interface CSRCaseCardProps {
  csrCase: CSRCase;
  onOpen?: (csrCase: CSRCase) => void;
  /** Shows the SLA countdown — used on the priority queue. */
  showSla?: boolean;
  className?: string;
}

export function CSRCaseCard({ csrCase, onOpen, showSla = true, className }: CSRCaseCardProps) {
  const sla = formatCountdown(
    csrCase.status === 'OPEN' ? csrCase.firstResponseDueAt : csrCase.resolutionDueAt,
  );
  const settled = csrCase.status === 'RESOLVED' || csrCase.status === 'CLOSED';

  const Wrapper = onOpen ? 'button' : 'div';

  return (
    <Wrapper
      {...(onOpen
        ? { type: 'button' as const, onClick: () => onOpen(csrCase) }
        : {})}
      className={cn(
        'w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition-shadow',
        onOpen &&
          'hover:border-slate-300 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        csrCase.escalatedToAdmin && 'border-l-4 border-l-red-500',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-xs font-medium text-slate-500">{csrCase.reference}</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            {CASE_TYPE_LABELS[csrCase.type]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {csrCase.escalatedToAdmin && <StatusBadge label="Escalated" tone="danger" size="sm" />}
          {csrCase.priority === 'HIGH' && <StatusBadge label="High priority" tone="warning" size="sm" />}
          <CaseStatusBadge status={csrCase.status} size="sm" />
        </div>
      </div>

      <p className="mt-2 text-sm text-slate-600">{truncate(csrCase.description, 140)}</p>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-slate-500">Buyer</dt>
          <dd className="truncate font-medium text-slate-900">{csrCase.buyerName}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Order</dt>
          <dd className="truncate font-mono font-medium text-slate-900">{csrCase.orderReference}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Raised</dt>
          <dd className="font-medium text-slate-900">{formatRelative(csrCase.raisedAt)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Agent</dt>
          <dd className="truncate font-medium text-slate-900">
            {csrCase.assignedAgentName ?? 'Unassigned'}
          </dd>
        </div>
      </dl>

      {showSla && !settled && (
        <p
          className={cn(
            'mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium',
            sla.overdue
              ? 'bg-red-50 text-red-700'
              : sla.urgent
                ? 'bg-amber-50 text-amber-800'
                : 'bg-slate-50 text-slate-600',
          )}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.75 3.5a.75.75 0 00-1.5 0V8c0 .27.14.52.37.65l2.5 1.5a.75.75 0 10.76-1.3L8.75 7.58V4.5z" />
          </svg>
          {csrCase.status === 'OPEN' ? 'First response' : 'Resolution'}: {sla.text}
        </p>
      )}
    </Wrapper>
  );
}
