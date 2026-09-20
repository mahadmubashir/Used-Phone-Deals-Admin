import { cn } from '../lib/cn';
import { carrierLabel } from '../constants';
import { formatDateTime } from '../lib/format';
import { LoadingState, ErrorState, EmptyState } from './primitives';
import { StatusBadge } from './badges';
import type { Shipment } from '../types';
import type { StatusTone } from '../constants';

/**
 * Shipment tracking. Shippo data always arrives via the backend proxy — this
 * component never talks to Shippo directly.
 */

const SHIPMENT_TONES: Record<Shipment['status'], StatusTone> = {
  AWAITING_DISPATCH: 'neutral',
  IN_TRANSIT: 'progress',
  OUT_FOR_DELIVERY: 'info',
  DELIVERED: 'success',
  EXCEPTION: 'danger',
};

const SHIPMENT_LABELS: Record<Shipment['status'], string> = {
  AWAITING_DISPATCH: 'Awaiting dispatch',
  IN_TRANSIT: 'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  EXCEPTION: 'Delivery exception',
};

export interface TrackingWidgetProps {
  shipment: Shipment | null | undefined;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  /** Buyers see a friendlier, less technical presentation. */
  variant?: 'buyer' | 'staff';
  className?: string;
}

export function TrackingWidget({
  shipment,
  loading,
  error,
  onRetry,
  variant = 'buyer',
  className,
}: TrackingWidgetProps) {
  if (loading) return <LoadingState label="Fetching the latest tracking…" className={className} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} className={className} />;

  if (!shipment || !shipment.trackingNumber) {
    return (
      <EmptyState
        title="Not dispatched yet"
        description="Tracking details appear here as soon as your order leaves our warehouse. You will get an email the moment it does."
        className={className}
      />
    );
  }

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3.5">
        <div>
          <p className="text-sm font-semibold text-slate-900">{carrierLabel(shipment.carrier)}</p>
          <p className="mt-0.5 font-mono text-xs text-slate-600">{shipment.trackingNumber}</p>
        </div>
        <StatusBadge label={SHIPMENT_LABELS[shipment.status]} tone={SHIPMENT_TONES[shipment.status]} />
      </div>

      {shipment.status === 'EXCEPTION' && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">There is a problem with this delivery.</p>
          <p className="mt-0.5 text-xs">
            {variant === 'buyer'
              ? 'Our support team has been alerted and will be in touch. You do not need to do anything.'
              : 'Flagged to the CSR queue and Super Admin action queue.'}
          </p>
        </div>
      )}

      {shipment.events.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">
          No tracking scans recorded yet.
        </p>
      ) : (
        <ol className="divide-y divide-slate-100">
          {shipment.events.map((event, index) => (
            <li key={`${event.timestamp}-${index}`} className="flex gap-3 px-4 py-3">
              <span
                className={cn(
                  'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                  index === 0 ? 'bg-brand-600 ring-4 ring-brand-600/15' : 'bg-slate-300',
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">{event.description}</p>
                <p className="text-xs text-slate-500">
                  {formatDateTime(event.timestamp)}
                  {event.location && ` · ${event.location}`}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {shipment.trackingUrl && (
        <div className="border-t border-slate-200 px-4 py-3">
          <a
            href={shipment.trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline"
          >
            View on the carrier's website
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      )}
    </div>
  );
}
