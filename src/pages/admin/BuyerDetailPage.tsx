import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  CASE_TYPE_LABELS,
  Card,
  CardHeader,
  CaseStatusBadge,
  ConfirmationModal,
  EmptyState,
  ErrorState,
  LoadingState,
  OrderStatusBadge,
  StarRating,
  StatusBadge,
  errorMessage,
  formatDate,
  formatPrice,
  type Buyer,
  type CSRCase,
  type Order,
  type Review,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';
import { StatCard } from '@/components/StatCard';

interface BuyerDetail {
  buyer: Buyer;
  orders: Order[];
  reviews: Review[];
  cases: CSRCase[];
}

export function BuyerDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [action, setAction] = React.useState<'suspend' | 'reactivate' | null>(null);
  const [reason, setReason] = React.useState('');

  const query = useQuery({
    queryKey: queryKeys.admin.buyer(id),
    queryFn: () => api.get<BuyerDetail>(endpoints.admin.buyer(id)),
  });

  const mutate = useMutation({
    mutationFn: (kind: 'suspend' | 'reactivate') =>
      api.post(
        kind === 'suspend' ? endpoints.admin.suspendBuyer(id) : endpoints.admin.reactivateBuyer(id),
        { reason },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.buyer(id) });
      queryClient.invalidateQueries({ queryKey: ['admin', 'buyers'] });
      setAction(null);
      setReason('');
    },
  });

  if (query.isLoading) return <LoadingState label="Loading buyer…" />;
  if (query.isError) {
    return <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />;
  }

  const { buyer, orders, reviews, cases } = query.data!;
  const suspended = buyer.status === 'SUSPENDED';

  return (
    <>
      <Link to="/admin/buyers" className="text-sm font-medium text-brand-700 hover:underline">
        ← Back to buyers
      </Link>

      <div className="mt-3">
        <PageHeader
          title={`${buyer.firstName} ${buyer.lastName}`}
          description={`${buyer.email} · Registered ${formatDate(buyer.registeredAt)}`}
          actions={
            <div className="flex items-center gap-2">
              <StatusBadge
                label={suspended ? 'Suspended' : 'Active'}
                tone={suspended ? 'danger' : 'success'}
              />
              <Button
                variant={suspended ? 'primary' : 'danger'}
                onClick={() => setAction(suspended ? 'reactivate' : 'suspend')}
              >
                {suspended ? 'Reactivate account' : 'Suspend account'}
              </Button>
            </div>
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Orders placed" value={buyer.orderCount} />
        <StatCard label="Lifetime value" value={formatPrice(buyer.totalSpentPence)} tone="positive" />
        <StatCard label="Support cases" value={cases.length} tone={cases.length > 2 ? 'warning' : 'neutral'} />
        <StatCard label="Reviews written" value={reviews.length} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* ---- Orders ---- */}
        <Card>
          <CardHeader title="Order history" />
          {orders.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No orders yet" />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    to={`/admin/orders/${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium text-slate-900">
                        {order.reference}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {order.items[0]?.title} · {formatDate(order.placedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-900">
                        {formatPrice(order.totalPence)}
                      </span>
                      <OrderStatusBadge status={order.status} size="sm" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ---- Support cases ---- */}
        <Card>
          <CardHeader title="Support history" />
          {cases.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No support cases" description="This buyer has never needed to contact us." />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {cases.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/csr/cases/${item.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium text-slate-900">{item.reference}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {CASE_TYPE_LABELS[item.type]} · {formatDate(item.raisedAt)}
                      </p>
                    </div>
                    <CaseStatusBadge status={item.status} size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ---- Reviews ---- */}
        <Card className="xl:col-span-2">
          <CardHeader title="Reviews written" />
          {reviews.length === 0 ? (
            <div className="p-5">
              <EmptyState title="No reviews yet" />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {reviews.map((review) => (
                <li key={review.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{review.listingTitle}</p>
                    <div className="flex items-center gap-3">
                      <StarRating rating={review.rating} size="sm" />
                      <span className="text-xs text-slate-500">{formatDate(review.createdAt)}</span>
                    </div>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-700">{review.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmationModal
        open={action === 'suspend'}
        onClose={() => setAction(null)}
        onConfirm={() => mutate.mutate('suspend')}
        title="Suspend this buyer?"
        description={`${buyer.firstName} ${buyer.lastName} will no longer be able to sign in or place orders. Existing orders are unaffected.`}
        confirmLabel="Suspend account"
        confirmationPhrase="SUSPEND"
        loading={mutate.isPending}
        error={mutate.isError ? errorMessage(mutate.error) : null}
        requireReason
        onReasonChange={setReason}
      />

      <ConfirmationModal
        open={action === 'reactivate'}
        onClose={() => setAction(null)}
        onConfirm={() => mutate.mutate('reactivate')}
        title="Reactivate this buyer?"
        description="They will be able to sign in and place orders again."
        confirmLabel="Reactivate account"
        destructive={false}
        loading={mutate.isPending}
        error={mutate.isError ? errorMessage(mutate.error) : null}
        requireReason
        onReasonChange={setReason}
      />
    </>
  );
}
