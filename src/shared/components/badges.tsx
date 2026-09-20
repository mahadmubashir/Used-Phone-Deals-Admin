import { cn } from '../lib/cn';
import {
  CONDITION_GRADE_MAP,
  SUPPLIER_TIER_MAP,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  CASE_STATUS_LABELS,
  CASE_STATUS_TONES,
  type StatusTone,
} from '../constants';
import type { ConditionGrade, OrderStatus, CaseStatus, SupplierTier } from '../types';

/* ------------------------------------------------------------------ *
 * ConditionBadge — the platform's 4-tier grading, colour coded
 * ------------------------------------------------------------------ */

export interface ConditionBadgeProps {
  grade: ConditionGrade;
  size?: 'sm' | 'md' | 'lg';
  withDot?: boolean;
  className?: string;
}

export function ConditionBadge({ grade, size = 'md', withDot = true, className }: ConditionBadgeProps) {
  const def = CONDITION_GRADE_MAP[grade];
  if (!def) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset',
        size === 'sm' && 'px-2 py-0.5 text-[11px]',
        size === 'md' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-3 py-1.5 text-sm',
        def.className,
        className,
      )}
    >
      {withDot && <span className={cn('h-1.5 w-1.5 rounded-full', def.dotClassName)} aria-hidden="true" />}
      {def.label}
      <span className="sr-only"> condition</span>
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * StatusBadge — generic, tone-driven
 * ------------------------------------------------------------------ */

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  info: 'bg-sky-100 text-sky-800 ring-sky-500/20',
  progress: 'bg-indigo-100 text-indigo-800 ring-indigo-500/20',
  success: 'bg-emerald-100 text-emerald-800 ring-emerald-500/20',
  warning: 'bg-amber-100 text-amber-900 ring-amber-500/20',
  danger: 'bg-red-100 text-red-800 ring-red-500/20',
};

export interface StatusBadgeProps {
  label: string;
  tone?: StatusTone;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ label, tone = 'neutral', size = 'md', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium ring-1 ring-inset whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function OrderStatusBadge({ status, size }: { status: OrderStatus; size?: 'sm' | 'md' }) {
  return <StatusBadge label={ORDER_STATUS_LABELS[status]} tone={ORDER_STATUS_TONES[status]} size={size} />;
}

export function CaseStatusBadge({ status, size }: { status: CaseStatus; size?: 'sm' | 'md' }) {
  return <StatusBadge label={CASE_STATUS_LABELS[status]} tone={CASE_STATUS_TONES[status]} size={size} />;
}

export function TierBadge({ tier, className }: { tier: SupplierTier; className?: string }) {
  const def = SUPPLIER_TIER_MAP[tier];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        def.className,
        className,
      )}
    >
      {def.label}
    </span>
  );
}

/** Stock availability pill used on buyer product cards and detail pages. */
export function StockBadge({ inStock, className }: { inStock: boolean; className?: string }) {
  return (
    <StatusBadge
      label={inStock ? 'In stock' : 'Out of stock'}
      tone={inStock ? 'success' : 'neutral'}
      size="sm"
      className={className}
    />
  );
}
