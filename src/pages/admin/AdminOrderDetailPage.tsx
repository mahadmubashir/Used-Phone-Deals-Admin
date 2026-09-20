import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardHeader,
  ConditionBadge,
  ConfirmationModal,
  ErrorState,
  Field,
  LoadingState,
  OrderStatusBadge,
  Select,
  StatusBadge,
  TrackingWidget,
  errorMessage,
  formatDateTime,
  formatPrice,
  type Order,
  type Paginated,
  type Supplier,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';

type Override = 'cancel' | 'deliver' | 'refund' | 'reassign' | null;

/**
 * Admin order view with the manual override panel.
 *
 * Every override here requires a written reason and is written to the audit
 * log with a timestamp — these are the escape hatches for edge cases, not
 * routine tools.
 */
export function AdminOrderDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [override, setOverride] = React.useState<Override>(null);
  const [reason, setReason] = React.useState('');
  const [reassignTo, setReassignTo] = React.useState('');

  const query = useQuery({
    queryKey: queryKeys.admin.order(id),
    queryFn: () => api.get<Order>(endpoints.admin.order(id)),
  });

  const suppliers = useQuery({
    queryKey: queryKeys.admin.suppliers({ active: true }),
    queryFn: () =>
      api.get<Paginated<Supplier>>(endpoints.admin.suppliers, {
        query: { status: 'ACTIVE', pageSize: 100 },
      }),
    enabled: override === 'reassign',
  });

  const run = useMutation({
    mutationFn: (kind: Exclude<Override, null>) => {
      const url = {
        cancel: endpoints.admin.forceCancelOrder(id),
        deliver: endpoints.admin.markDelivered(id),
        refund: endpoints.admin.manualRefund(id),
        reassign: endpoints.admin.reassignOrder(id),
      }[kind];
      return api.post<Order>(url, { reason, supplierId: reassignTo || undefined });
    },
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.admin.order(id), order);
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      setOverride(null);
      setReason('');
      setReassignTo('');
    },
  });

  if (query.isLoading) return <LoadingState label="Loading order…" />;
  if (query.isError) {
    return <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />;
  }

  const order = query.data!;

  return (
    <>
      <Link to="/admin/orders" className="text-sm font-medium text-brand-700 hover:underline">
        ← Back to all orders
      </Link>

      <div className="mt-3">
        <PageHeader
          title={order.reference}
          description={`Placed ${formatDateTime(order.placedAt)}${order.isGuest ? ' · Guest checkout' : ''}`}
          actions={
            <div className="flex items-center gap-2">
              <StatusBadge label={order.paymentStatus.replace(/_/g, ' ')} tone="info" />
              <OrderStatusBadge status={order.status} />
            </div>
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {/* ---- Items ---- */}
          <Card>
            <CardHeader title="Items" />
            <ul className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 p-5">
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-lg bg-slate-50 object-contain p-1.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <ConditionBadge grade={item.conditionGrade} size="sm" />
                      <span className="text-xs text-slate-500">Qty {item.quantity}</span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatPrice(item.unitPricePence * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-slate-200 px-5 py-4 text-sm">
              <SummaryRow label="Subtotal" value={formatPrice(order.subtotalPence)} />
              <SummaryRow
                label="Delivery"
                value={order.shippingPence === 0 ? 'Free' : formatPrice(order.shippingPence)}
              />
              {order.commissionPence !== undefined && (
                <SummaryRow
                  label="Platform commission"
                  value={formatPrice(order.commissionPence)}
                  tone="positive"
                />
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
                <dt className="font-semibold text-slate-900">Order total</dt>
                <dd className="font-bold text-slate-900">{formatPrice(order.totalPence)}</dd>
              </div>
            </dl>
          </Card>

          {/* ---- Tracking ---- */}
          <section aria-labelledby="tracking-heading">
            <h2 id="tracking-heading" className="mb-3 text-base font-semibold text-slate-900">
              Delivery tracking
            </h2>
            <TrackingWidget shipment={order.shipment} variant="staff" />
          </section>
        </div>

        {/* ---- Sidebar ---- */}
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardHeader title="Buyer" />
            <div className="space-y-3 p-5 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Name</p>
                <p className="mt-0.5 font-medium text-slate-900">{order.buyerName}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-slate-500">Contact</p>
                <p className="mt-0.5 truncate font-medium text-slate-900">{order.buyerEmail}</p>
                <p className="text-xs text-slate-600">{order.buyerPhone}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Delivery address</p>
                <address className="mt-0.5 text-sm not-italic leading-relaxed text-slate-700">
                  {order.deliveryAddress.line1}
                  <br />
                  {order.deliveryAddress.city}
                  <br />
                  {order.deliveryAddress.postcode}
                </address>
              </div>
              {order.buyerId && (
                <Link
                  to={`/admin/buyers/${order.buyerId}`}
                  className="inline-block text-sm font-medium text-brand-700 hover:underline"
                >
                  View buyer history
                </Link>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Allocated supplier" />
            <div className="p-5 text-sm">
              {order.supplierId ? (
                <>
                  <Link
                    to={`/admin/suppliers/${order.supplierId}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {order.supplierName}
                  </Link>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">
                    Chosen by the weighted allocation algorithm. Never disclosed to the buyer.
                  </p>
                </>
              ) : (
                <p className="text-slate-500">Not yet allocated</p>
              )}
            </div>
          </Card>

          {/* ---- Overrides ---- */}
          <Card className="border-amber-200">
            <CardHeader
              title="Manual overrides"
              description="Edge cases only. Every action requires a reason and is written to the audit log."
            />
            <div className="space-y-2 p-5">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setOverride('reassign')}
                disabled={order.status === 'COMPLETED' || order.status === 'CANCELLED'}
              >
                Reassign to another supplier
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={() => setOverride('deliver')}
                disabled={order.status === 'DELIVERED' || order.status === 'COMPLETED'}
              >
                Manually mark as delivered
              </Button>
              <Button
                variant="outline"
                fullWidth
                onClick={() => setOverride('refund')}
                disabled={order.paymentStatus === 'REFUNDED'}
              >
                Issue manual refund
              </Button>
              <Button
                variant="danger"
                fullWidth
                onClick={() => setOverride('cancel')}
                disabled={order.status === 'CANCELLED'}
              >
                Force cancel order
              </Button>
            </div>
          </Card>
        </aside>
      </div>

      {/* ---------------- Override confirmations ---------------- */}

      <ConfirmationModal
        open={override === 'cancel'}
        onClose={() => setOverride(null)}
        onConfirm={() => run.mutate('cancel')}
        title="Force cancel this order?"
        description={`${order.reference} will be cancelled regardless of its current state and the buyer refunded in full. Use this only when the normal cancellation route is unavailable.`}
        confirmLabel="Force cancel"
        confirmationPhrase="CANCEL"
        loading={run.isPending}
        error={run.isError ? errorMessage(run.error) : null}
        requireReason
        onReasonChange={setReason}
      />

      <ConfirmationModal
        open={override === 'deliver'}
        onClose={() => setOverride(null)}
        onConfirm={() => run.mutate('deliver')}
        title="Manually mark as delivered?"
        description="This starts the 30-day return window immediately, without waiting for the carrier webhook. Use it when a delivery is confirmed by other means."
        confirmLabel="Mark as delivered"
        destructive={false}
        loading={run.isPending}
        error={run.isError ? errorMessage(run.error) : null}
        requireReason
        onReasonChange={setReason}
      />

      <ConfirmationModal
        open={override === 'refund'}
        onClose={() => setOverride(null)}
        onConfirm={() => run.mutate('refund')}
        title="Issue a manual refund?"
        description={`${formatPrice(order.totalPence)} will be refunded to the buyer via Stripe, outside the normal CSR case flow. This cannot be reversed.`}
        confirmLabel={`Refund ${formatPrice(order.totalPence)}`}
        confirmationPhrase="REFUND"
        loading={run.isPending}
        error={run.isError ? errorMessage(run.error) : null}
        requireReason
        onReasonChange={setReason}
      />

      <ConfirmationModal
        open={override === 'reassign'}
        onClose={() => setOverride(null)}
        onConfirm={() => run.mutate('reassign')}
        title="Reassign this order"
        description="The order returns to Pending Confirmation with the new supplier, who gets a fresh 1-business-day SLA."
        confirmLabel="Reassign order"
        destructive={false}
        loading={run.isPending}
        error={run.isError ? errorMessage(run.error) : null}
        requireReason
        onReasonChange={setReason}
      >
        <Field id="reassign-to" label="New supplier" required>
          <Select
            id="reassign-to"
            value={reassignTo}
            onChange={(event) => setReassignTo(event.target.value)}
            placeholder="Choose a supplier…"
            options={(suppliers.data?.data ?? [])
              .filter((entry) => entry.id !== order.supplierId)
              .map((entry) => ({
                value: entry.id,
                label: `${entry.businessName} (${entry.tier})`,
              }))}
          />
        </Field>
      </ConfirmationModal>
    </>
  );
}

function SummaryRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'positive';
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-600">{label}</dt>
      <dd className={tone === 'positive' ? 'font-medium text-emerald-700' : 'font-medium text-slate-900'}>
        {value}
      </dd>
    </div>
  );
}
