import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CASE_TYPE_LABELS,
  Card,
  CardHeader,
  CaseStatusBadge,
  ErrorState,
  LoadingState,
  RETURN_REASONS,
  SLA,
  StatusBadge,
  cn,
  errorMessage,
  formatCountdown,
  formatDateTime,
  formatPrice,
  type CSRCase,
  type Order,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { useAuth } from '@/stores/auth';
import { ActionPanel } from './ActionPanel';
import { PageHeader } from '@/layouts/PortalLayout';

/**
 * The CSR case working view.
 *
 * Everything the agent does to a case happens here and is written to the
 * activity log with the agent's name and a timestamp. The buyer and the
 * supplier are kept strictly apart: the "Reply to buyer" and "Notify supplier"
 * actions are separate channels that never cross.
 */
export function CaseDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  const query = useQuery({
    queryKey: queryKeys.csr.case(id),
    queryFn: () => api.get<CSRCase>(endpoints.csr.case(id)),
  });

  if (query.isLoading) return <LoadingState label="Loading case…" />;
  if (query.isError) {
    return <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />;
  }

  const csrCase = query.data!;
  const settled = csrCase.status === 'RESOLVED' || csrCase.status === 'CLOSED';
  const sla = formatCountdown(
    csrCase.status === 'OPEN' ? csrCase.firstResponseDueAt : csrCase.resolutionDueAt,
  );

  return (
    <>
      <Link to="/csr/cases" className="text-sm font-medium text-brand-700 hover:underline">
        ← Back to the queue
      </Link>

      <div className="mt-3">
        <PageHeader
          title={csrCase.reference}
          description={
            <>
              {CASE_TYPE_LABELS[csrCase.type]} · Raised {formatDateTime(csrCase.raisedAt)} ·{' '}
              {csrCase.assignedAgentName
                ? `Assigned to ${csrCase.assignedAgentName}`
                : 'Unassigned'}
            </>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {csrCase.escalatedToAdmin && <StatusBadge label="Escalated to admin" tone="danger" />}
              {csrCase.priority === 'HIGH' && <StatusBadge label="High priority" tone="warning" />}
              <CaseStatusBadge status={csrCase.status} />
            </div>
          }
        />
      </div>

      {!settled && (
        <div
          className={cn(
            'mb-6 rounded-xl border px-4 py-3',
            sla.overdue
              ? 'border-red-200 bg-red-50'
              : sla.urgent
                ? 'border-amber-200 bg-amber-50'
                : 'border-slate-200 bg-white',
          )}
        >
          <p className="text-sm font-medium text-slate-900">
            {csrCase.status === 'OPEN' ? 'First response' : 'Resolution'} SLA — {sla.text}
          </p>
          <p className="mt-0.5 text-xs text-slate-600">
            Targets: first reply within {SLA.csrFirstResponseDays} business day, resolution within{' '}
            {SLA.csrResolutionDays}.
          </p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        {/* ---------------- Left: context & history ---------------- */}
        <div className="space-y-6">
          <BuyerPanel csrCase={csrCase} />
          <OrderPanel orderId={csrCase.orderId} />

          {/* ---- Buyer's own description ---- */}
          <Card>
            <CardHeader
              title="What the buyer told us"
              description="Submitted by the buyer — read only."
            />
            <div className="p-5">
              {csrCase.reason && (
                <div className="mb-3">
                  <StatusBadge
                    label={
                      RETURN_REASONS.find((r) => r.value === csrCase.reason)?.label ?? csrCase.reason
                    }
                    tone="info"
                    size="sm"
                  />
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {csrCase.description}
              </p>

              {csrCase.attachments.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-900">
                    Evidence supplied ({csrCase.attachments.length})
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {csrCase.attachments.map((attachment) => (
                      <li key={attachment.id}>
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block overflow-hidden rounded-lg border border-slate-200 transition-colors hover:border-brand-400"
                        >
                          <img
                            src={attachment.url}
                            alt={attachment.filename}
                            className="h-24 w-24 bg-slate-50 object-contain p-1"
                          />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          {csrCase.supplierResponse && <SupplierResponsePanel csrCase={csrCase} />}

          <ActivityTimeline csrCase={csrCase} />
        </div>

        {/* ---------------- Right: actions ---------------- */}
        <aside className="xl:sticky xl:top-24 xl:self-start">
          <ActionPanel csrCase={csrCase} isAdmin={isAdmin} />
        </aside>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Context panels
 * ------------------------------------------------------------------ */

function BuyerPanel({ csrCase }: { csrCase: CSRCase }) {
  return (
    <Card>
      <CardHeader title="Buyer" />
      <dl className="grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Name</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">{csrCase.buyerName}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt>
          <dd className="mt-1 truncate text-sm font-medium text-slate-900">{csrCase.buyerEmail}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Account</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">
            {csrCase.buyerId ? (
              <Link
                to={`/admin/buyers/${csrCase.buyerId}`}
                className="text-brand-700 hover:underline"
              >
                View history
              </Link>
            ) : (
              'Guest checkout'
            )}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function OrderPanel({ orderId }: { orderId: string }) {
  const query = useQuery({
    queryKey: queryKeys.csr.orders({ id: orderId }),
    queryFn: () => api.get<Order>(endpoints.csr.order(orderId)),
  });

  if (query.isLoading) {
    return (
      <Card className="p-5">
        <LoadingState label="Loading order…" />
      </Card>
    );
  }

  if (query.isError) {
    return (
      <Card className="p-5">
        <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
      </Card>
    );
  }

  const order = query.data!;

  return (
    <Card>
      <CardHeader
        title="Order"
        action={
          <Link
            to={`/admin/orders/${order.id}`}
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            Full order
          </Link>
        }
      />
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-sm font-medium text-slate-900">{order.reference}</p>
          <StatusBadge label={order.status} tone="info" size="sm" />
        </div>

        <ul className="mt-4 space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-3">
              <img
                src={item.imageUrl}
                alt=""
                className="h-14 w-14 shrink-0 rounded-lg bg-slate-50 object-contain p-1"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{item.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {item.conditionGrade} · Qty {item.quantity} ·{' '}
                  {formatPrice(item.unitPricePence * item.quantity)}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <dl className="mt-4 grid gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Order total</dt>
            <dd className="mt-0.5 font-semibold text-slate-900">{formatPrice(order.totalPence)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Payment</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{order.paymentStatus}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Tracking</dt>
            <dd className="mt-0.5 font-medium text-slate-900">
              {order.shipment.trackingNumber ?? 'Not dispatched'}
            </dd>
          </div>
        </dl>

        {order.supplierName && (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Fulfilled by <span className="font-medium text-slate-900">{order.supplierName}</span> —
            internal only, never disclosed to the buyer.
          </p>
        )}
      </div>
    </Card>
  );
}

function SupplierResponsePanel({ csrCase }: { csrCase: CSRCase }) {
  return (
    <Card className="border-l-4 border-l-brand-500">
      <CardHeader
        title="Supplier response"
        description="Submitted by the supplier from their dashboard. Relay the outcome to the buyer in your own words."
      />
      <div className="p-5">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
          {csrCase.supplierResponse!.message}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Received {formatDateTime(csrCase.supplierResponse!.respondedAt)}
        </p>
      </div>
    </Card>
  );
}

function ActivityTimeline({ csrCase }: { csrCase: CSRCase }) {
  return (
    <Card>
      <CardHeader
        title="Case activity"
        description="Full audit trail — every action, who took it and when."
      />
      <ol className="divide-y divide-slate-100">
        {csrCase.activity.map((entry) => (
          <li key={entry.id} className="flex gap-3 px-5 py-4">
            <span
              className={cn(
                'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                entry.visibleToBuyer ? 'bg-brand-600' : 'bg-slate-300',
              )}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-slate-900">{entry.action}</p>
                {entry.visibleToBuyer && (
                  <StatusBadge label="Buyer notified" tone="info" size="sm" />
                )}
              </div>
              {entry.detail && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{entry.detail}</p>
              )}
              <p className="mt-1 text-xs text-slate-400">
                {entry.agentName} · {formatDateTime(entry.timestamp)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
