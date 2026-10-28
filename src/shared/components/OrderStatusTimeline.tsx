import { cn } from '../lib/cn';
import { formatDateTime } from '../lib/format';
import { BUYER_ORDER_TIMELINE, ORDER_STATUS_LABELS } from '../constants';
import type { Order, OrderStatus } from '../types';

export interface TimelineStep {
  status: OrderStatus;
  label: string;
  timestamp?: string | null;
  detail?: string;
}

export interface OrderStatusTimelineProps {
  status: OrderStatus;
  steps?: TimelineStep[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/**
 * Placed → Confirmed → Shipped → Delivered → Completed.
 *
 * "Confirmed" here means confirmed by UsedPhoneDeals.com as far as the buyer
 * is concerned — supplier confirmation is an internal event and is never
 * labelled as such on the buyer portal.
 */
export function OrderStatusTimeline({
  status,
  steps,
  orientation = 'horizontal',
  className,
}: OrderStatusTimelineProps) {
  const terminal = status === 'CANCELLED' || status === 'REFUNDED';

  const resolvedSteps: TimelineStep[] =
    steps ??
    BUYER_ORDER_TIMELINE.map((step) => ({ status: step, label: ORDER_STATUS_LABELS[step] }));

  const currentIndex = terminal
    ? -1
    : resolvedSteps.findIndex((step) => step.status === status);

  if (terminal) {
    return (
      <div
        className={cn(
          'rounded-xl border px-4 py-3.5 text-sm',
          status === 'CANCELLED'
            ? 'border-slate-200 bg-slate-50 text-slate-700'
            : 'border-amber-200 bg-amber-50 text-amber-900',
          className,
        )}
      >
        <p className="font-semibold">
          {status === 'CANCELLED' ? 'This order was cancelled' : 'This order was refunded'}
        </p>
        <p className="mt-0.5 text-xs">
          {status === 'CANCELLED'
            ? 'Any payment taken has been returned to your original payment method.'
            : 'Your refund has been issued and should appear within 5–10 business days.'}
        </p>
      </div>
    );
  }

  if (orientation === 'vertical') {
    return (
      <ol className={cn('relative space-y-0', className)}>
        {resolvedSteps.map((step, index) => {
          const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming';
          const isLast = index === resolvedSteps.length - 1;
          return (
            <li key={step.status} className="relative flex gap-4 pb-6 last:pb-0">
              {!isLast && (
                <span
                  className={cn(
                    'absolute left-[11px] top-6 h-full w-0.5',
                    state === 'done' ? 'bg-brand-600' : 'bg-slate-200',
                  )}
                  aria-hidden="true"
                />
              )}
              <StepMarker state={state} />
              <div className="-mt-0.5 flex-1">
                <p
                  className={cn(
                    'text-sm font-medium',
                    state === 'upcoming' ? 'text-slate-400' : 'text-slate-900',
                  )}
                >
                  {step.label}
                </p>
                {step.timestamp && (
                  <p className="text-xs text-slate-500">{formatDateTime(step.timestamp)}</p>
                )}
                {step.detail && <p className="mt-0.5 text-xs text-slate-600">{step.detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={cn('flex w-full items-start', className)}>
      {resolvedSteps.map((step, index) => {
        const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming';
        const isLast = index === resolvedSteps.length - 1;
        return (
          <li key={step.status} className={cn('flex flex-1 flex-col items-center', isLast && 'flex-none')}>
            <div className="flex w-full items-center">
              <StepMarker state={state} />
              {!isLast && (
                <span
                  className={cn('h-0.5 flex-1', index < currentIndex ? 'bg-brand-600' : 'bg-slate-200')}
                  aria-hidden="true"
                />
              )}
            </div>
            <div className={cn('mt-2 pr-2 text-left', isLast && 'pr-0')}>
              <p
                className={cn(
                  'text-xs font-medium sm:text-sm',
                  state === 'upcoming' ? 'text-slate-400' : 'text-slate-900',
                )}
              >
                {step.label}
              </p>
              {step.timestamp && (
                <p className="hidden text-[11px] text-slate-500 sm:block">{formatDateTime(step.timestamp)}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StepMarker({ state }: { state: 'done' | 'current' | 'upcoming' }) {
  return (
    <span
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-white',
        state === 'done' && 'border-brand-600 bg-brand-600',
        state === 'current' && 'border-brand-600 bg-white ring-4 ring-brand-600/15',
        state === 'upcoming' && 'border-slate-300 bg-white',
      )}
      aria-hidden="true"
    >
      {state === 'done' && (
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {state === 'current' && <span className="h-2 w-2 rounded-full bg-brand-600" />}
    </span>
  );
}

/** Builds timeline steps from an order's real timestamps. */
export function timelineStepsFromOrder(order: Order): TimelineStep[] {
  return [
    { status: 'PLACED', label: 'Placed', timestamp: order.placedAt },
    { status: 'CONFIRMED', label: 'Confirmed', timestamp: order.confirmedAt },
    { status: 'SHIPPED', label: 'Shipped', timestamp: order.shipment.shippedAt },
    { status: 'DELIVERED', label: 'Delivered', timestamp: order.shipment.deliveredAt },
    {
      status: 'COMPLETED',
      label: 'Completed',
      timestamp: order.status === 'COMPLETED' ? order.returnWindowEndsAt : null,
    },
  ];
}
