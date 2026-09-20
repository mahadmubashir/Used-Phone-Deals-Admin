import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  APPROVED_CARRIERS,
  Button,
  Card,
  CardHeader,
  ConditionBadge,
  ConfirmationModal,
  ErrorState,
  Field,
  Input,
  LoadingState,
  OrderStatusBadge,
  SLA,
  Select,
  TrackingWidget,
  errorMessage,
  formatCountdown,
  formatDateTime,
  formatPostcode,
  isApprovedCarrier,
  validateCarrier,
  validateTrackingNumber,
  type CarrierCode,
  type Order,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';

export function SupplierOrderDetail() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const query = useQuery({
    queryKey: queryKeys.supplier.order(id),
    queryFn: () => api.get<Order>(endpoints.supplier.order(id)),
  });

  const confirm = useMutation({
    mutationFn: () => api.post<Order>(endpoints.supplier.confirmOrder(id)),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.supplier.order(id), order);
      queryClient.invalidateQueries({ queryKey: ['supplier', 'orders'] });
      setConfirmOpen(false);
    },
  });

  if (query.isLoading) return <LoadingState label="Loading order…" />;
  if (query.isError) {
    return <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />;
  }

  const order = query.data!;
  const sla = order.confirmationDueAt ? formatCountdown(order.confirmationDueAt) : null;

  return (
    <>
      <Link to="/supplier/orders" className="text-sm font-medium text-brand-700 hover:underline">
        ← Back to orders
      </Link>

      <div className="mt-3">
        <PageHeader
          title={order.reference}
          description={`Placed ${formatDateTime(order.placedAt)}`}
          actions={<OrderStatusBadge status={order.status} />}
        />
      </div>

      {/* ---- SLA banner ---- */}
      {order.status === 'PLACED' && sla && (
        <div
          className={`mb-6 rounded-xl border p-4 ${
            sla.overdue
              ? 'border-red-200 bg-red-50'
              : sla.urgent
                ? 'border-amber-200 bg-amber-50'
                : 'border-slate-200 bg-white'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Confirmation {sla.overdue ? 'overdue' : 'required'} — {sla.text}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                If this is not confirmed within {SLA.supplierOrderConfirmationDays} business day the
                order is cancelled, the buyer is refunded in full, and the allocation algorithm
                reassigns it to another supplier.
              </p>
            </div>
            <Button onClick={() => setConfirmOpen(true)} loading={confirm.isPending}>
              Confirm this order
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          {/* ---- Items ---- */}
          <Card>
            <CardHeader title="Items to fulfil" />
            <ul className="divide-y divide-slate-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 p-5">
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-lg bg-slate-50 object-contain p-2"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <ConditionBadge grade={item.conditionGrade} size="sm" />
                      <span className="text-xs text-slate-500">Quantity: {item.quantity}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Dispatch a unit matching this exact grade. If you no longer hold one at this
                      grade, contact the admin team rather than substituting.
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* ---- Dispatch ---- */}
          {order.status === 'CONFIRMED' && <DispatchPanel orderId={id} />}

          {/* ---- Tracking ---- */}
          {(order.status === 'SHIPPED' ||
            order.status === 'DELIVERED' ||
            order.status === 'COMPLETED') && (
            <section aria-labelledby="tracking-heading">
              <h2 id="tracking-heading" className="mb-3 text-base font-semibold text-slate-900">
                Tracking
              </h2>
              <TrackingWidget shipment={order.shipment} variant="staff" />
            </section>
          )}
        </div>

        {/* ---- Sidebar ---- */}
        <aside className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Delivery</h2>
            <p className="mt-3 text-xs uppercase tracking-wide text-slate-500">Postcode</p>
            <p className="mt-0.5 font-mono text-lg font-semibold text-slate-900">
              {formatPostcode(order.deliveryPostcode)}
            </p>
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
              The full delivery address is supplied directly to the carrier when the label is
              generated. Suppliers are given the postcode only, to protect buyer privacy.
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Timeline</h2>
            <dl className="mt-3 space-y-2.5 text-xs">
              <TimelineRow label="Allocated to you" value={formatDateTime(order.placedAt)} />
              <TimelineRow
                label="Confirmed"
                value={order.confirmedAt ? formatDateTime(order.confirmedAt) : 'Not yet'}
              />
              <TimelineRow
                label="Dispatched"
                value={
                  order.shipment.shippedAt ? formatDateTime(order.shipment.shippedAt) : 'Not yet'
                }
              />
              <TimelineRow
                label="Delivered"
                value={
                  order.shipment.deliveredAt ? formatDateTime(order.shipment.deliveredAt) : 'Not yet'
                }
              />
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-slate-900">Payout</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              Funds for this order are held in escrow until the buyer&apos;s{' '}
              {SLA.returnWindowDays}-day return window has passed, then released automatically to
              your Stripe Connect account, net of platform commission.
            </p>
            <Link
              to="/supplier/earnings"
              className="mt-3 inline-block text-xs font-medium text-brand-700 hover:underline"
            >
              View earnings
            </Link>
          </Card>
        </aside>
      </div>

      <ConfirmationModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => confirm.mutate()}
        title="Confirm this order?"
        description={`By confirming ${order.reference} you are committing to dispatch the item at the stated condition grade. This stops the confirmation SLA clock.`}
        confirmLabel="Yes, confirm the order"
        destructive={false}
        loading={confirm.isPending}
        error={confirm.isError ? errorMessage(confirm.error) : null}
      />
    </>
  );
}

function TimelineRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Dispatch — approved carriers only, never free text
 * ------------------------------------------------------------------ */

function DispatchPanel({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const [carrier, setCarrier] = React.useState('');
  const [trackingNumber, setTrackingNumber] = React.useState('');
  const [errors, setErrors] = React.useState<{ carrier?: string; trackingNumber?: string }>({});
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const ship = useMutation({
    mutationFn: () =>
      api.post<Order>(endpoints.supplier.shipOrder(orderId), {
        carrier: carrier as CarrierCode,
        trackingNumber: trackingNumber.trim(),
      }),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.supplier.order(orderId), order);
      queryClient.invalidateQueries({ queryKey: ['supplier', 'orders'] });
      setConfirmOpen(false);
    },
  });

  function validate(): boolean {
    const next = {
      carrier: validateCarrier(carrier),
      trackingNumber: validateTrackingNumber(trackingNumber),
    };
    setErrors(next);
    return !next.carrier && !next.trackingNumber;
  }

  return (
    <Card>
      <CardHeader
        title="Mark as shipped"
        description="Every shipment must be fully tracked with a signature on delivery."
      />

      <div className="space-y-5 p-5">
        <Field
          id="carrier"
          label="Carrier service"
          required
          error={errors.carrier}
          hint="Approved services only — all are tracked and signed for."
        >
          <Select
            id="carrier"
            value={carrier}
            onChange={(event) => {
              setCarrier(event.target.value);
              setErrors((current) => ({ ...current, carrier: undefined }));
            }}
            placeholder="Choose a carrier service…"
            invalid={Boolean(errors.carrier)}
            options={APPROVED_CARRIERS.map((entry) => ({
              value: entry.code,
              label: entry.label,
            }))}
          />
        </Field>

        <Field
          id="trackingNumber"
          label="Tracking number"
          required
          error={errors.trackingNumber}
          hint="As issued by the carrier. This is passed to Shippo and shown to the buyer."
        >
          <Input
            id="trackingNumber"
            value={trackingNumber}
            onChange={(event) => {
              setTrackingNumber(event.target.value);
              setErrors((current) => ({ ...current, trackingNumber: undefined }));
            }}
            invalid={Boolean(errors.trackingNumber)}
            className="font-mono"
            placeholder="RM123456789GB"
          />
        </Field>

        {carrier && isApprovedCarrier(carrier) && (
          <div className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.8 3.8 6.8-6.8a1 1 0 011.4 0z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-xs text-emerald-900">
              Tracked with signature on delivery — meets the platform requirement.
            </p>
          </div>
        )}

        {ship.isError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800">
            {errorMessage(ship.error)}
          </p>
        )}

        <Button
          size="lg"
          onClick={() => {
            if (validate()) setConfirmOpen(true);
          }}
        >
          Mark as shipped
        </Button>
      </div>

      <ConfirmationModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => ship.mutate()}
        title="Mark this order as shipped?"
        description="The buyer will be emailed the tracking details immediately and will be able to follow the parcel from their account."
        confirmLabel="Yes, it's on its way"
        destructive={false}
        loading={ship.isPending}
        error={ship.isError ? errorMessage(ship.error) : null}
      >
        <dl className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-600">Carrier</dt>
            <dd className="text-right font-medium text-slate-900">
              {APPROVED_CARRIERS.find((entry) => entry.code === carrier)?.label}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-600">Tracking</dt>
            <dd className="font-mono font-medium text-slate-900">{trackingNumber}</dd>
          </div>
        </dl>
      </ConfirmationModal>
    </Card>
  );
}
