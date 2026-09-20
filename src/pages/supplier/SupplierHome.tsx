import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  OrderStatusBadge,
  SLA,
  StatusBadge,
  SUPPLIER_NOTIFICATION_LABELS,
  SUPPLIER_TIER_MAP,
  errorMessage,
  formatCountdown,
  formatDate,
  formatPrice,
  type Order,
  type Paginated,
  type SupplierCsrNotification,
  type SupplierTier,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';
import { StatCard } from '@/components/StatCard';

interface SupplierSummary {
  totalStockUnits: number;
  activeSubmissions: number;
  pendingOrders: number;
  completedOrders: number;
  totalEarningsPence: number;
  tier: SupplierTier;
  unreadCsrNotifications: number;
}

export function SupplierHome() {
  const summary = useQuery({
    queryKey: queryKeys.supplier.summary,
    queryFn: () => api.get<SupplierSummary>(endpoints.supplier.summary),
  });

  const orders = useQuery({
    queryKey: queryKeys.supplier.orders({ recent: true }),
    queryFn: () =>
      api.get<Paginated<Order>>(endpoints.supplier.orders, { query: { pageSize: 5 } }),
  });

  const notifications = useQuery({
    queryKey: queryKeys.supplier.csrNotifications,
    queryFn: () => api.get<SupplierCsrNotification[]>(endpoints.supplier.csrNotifications),
  });

  if (summary.isLoading) return <LoadingState label="Loading your dashboard…" />;
  if (summary.isError) {
    return <ErrorState message={errorMessage(summary.error)} onRetry={() => void summary.refetch()} />;
  }

  const data = summary.data!;
  const tier = SUPPLIER_TIER_MAP[data.tier];
  const actionRequired = (notifications.data ?? []).filter((n) => n.status === 'ACTION_REQUIRED');
  const nextTier = nextTierHint(data.totalStockUnits);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your stock, orders and earnings at a glance."
        tier={data.tier}
        actions={
          <Link to="/supplier/submit-stock">
            <Button>Submit stock</Button>
          </Link>
        }
      />

      {actionRequired.length > 0 && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-red-900">
                {actionRequired.length} support{' '}
                {actionRequired.length === 1 ? 'request needs' : 'requests need'} your response
              </h2>
              <p className="mt-1 text-xs text-red-800">
                Respond within {SLA.supplierCsrResponseDays} business days or an automatic refund is
                issued to the buyer and the case is flagged to the Super Admin.
              </p>
            </div>
            <Link to="/supplier/csr-notifications">
              <Button variant="danger" size="sm">
                Review now
              </Button>
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total stock units" value={data.totalStockUnits} hint={nextTier} />
        <StatCard label="Active stock submissions" value={data.activeSubmissions} />
        <StatCard
          label="Pending confirmation"
          value={data.pendingOrders}
          tone={data.pendingOrders > 0 ? 'warning' : 'neutral'}
          hint={
            data.pendingOrders > 0
              ? `Confirm within ${SLA.supplierOrderConfirmationDays} business day`
              : 'Nothing waiting'
          }
        />
        <StatCard label="Completed orders" value={data.completedOrders} />
        <StatCard
          label="Total earnings"
          value={formatPrice(data.totalEarningsPence)}
          hint="Net of platform commission"
        />
        <StatCard label="Current tier" value={tier.label} hint={tierRange(data.tier)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* ---- Recent orders ---- */}
        <Card>
          <CardHeader
            title="Recent orders"
            action={
              <Link to="/supplier/orders" className="text-sm font-medium text-brand-700 hover:underline">
                View all
              </Link>
            }
          />
          {orders.isLoading ? (
            <LoadingState />
          ) : (orders.data?.data ?? []).length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No orders yet"
                description="Orders allocated to you by the platform will appear here."
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {orders.data!.data.map((order) => {
                const sla = order.confirmationDueAt ? formatCountdown(order.confirmationDueAt) : null;
                return (
                  <li key={order.id}>
                    <Link
                      to={`/supplier/orders/${order.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-medium text-slate-900">
                          {order.reference}
                        </p>
                        <p className="mt-0.5 truncate text-sm text-slate-600">
                          {order.items[0]?.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{formatDate(order.placedAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {order.status === 'PLACED' && sla && (
                          <StatusBadge
                            label={sla.text}
                            tone={sla.overdue ? 'danger' : sla.urgent ? 'warning' : 'neutral'}
                            size="sm"
                          />
                        )}
                        <OrderStatusBadge status={order.status} size="sm" />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* ---- CSR notifications ---- */}
        <Card>
          <CardHeader
            title="Support requests"
            description="Sent to you by the customer service team."
            action={
              <Link
                to="/supplier/csr-notifications"
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                View all
              </Link>
            }
          />
          {notifications.isLoading ? (
            <LoadingState />
          ) : (notifications.data ?? []).length === 0 ? (
            <div className="p-5">
              <EmptyState title="Nothing to action" description="You are all caught up." />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.data!.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link
                    to="/supplier/csr-notifications"
                    className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {SUPPLIER_NOTIFICATION_LABELS[item.type]}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-slate-500">
                        {item.caseReference} · {item.orderReference}
                      </p>
                    </div>
                    <StatusBadge
                      label={
                        item.status === 'ACTION_REQUIRED'
                          ? 'Action required'
                          : item.status === 'RESPONDED'
                            ? 'Responded'
                            : 'Resolved'
                      }
                      tone={
                        item.status === 'ACTION_REQUIRED'
                          ? 'danger'
                          : item.status === 'RESPONDED'
                            ? 'progress'
                            : 'success'
                      }
                      size="sm"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function tierRange(tier: SupplierTier): string {
  const def = SUPPLIER_TIER_MAP[tier];
  return def.max ? `${def.min}–${def.max} units` : `${def.min}+ units`;
}

/** Tiers are calculated by the platform from total stock units. */
function nextTierHint(units: number): string {
  if (units > 300) return 'Top tier reached';
  const thresholds: [number, string][] = [
    [51, 'Silver'],
    [151, 'Gold'],
    [301, 'Premium'],
  ];
  for (const [threshold, label] of thresholds) {
    if (units < threshold) return `${threshold - units} more units to reach ${label}`;
  }
  return '';
}
