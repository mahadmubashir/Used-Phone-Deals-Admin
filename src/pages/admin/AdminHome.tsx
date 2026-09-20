import * as React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  TierBadge,
  cn,
  errorMessage,
  formatDate,
  formatPrice,
  formatRelative,
  type CSRCase,
  type Order,
  type Supplier,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';
import { StatCard } from '@/components/StatCard';
import { RevenueChart } from './RevenueChart';

type Period = 'today' | 'week' | 'month';

interface AdminSummary {
  grossRevenuePence: Record<Period, number>;
  commissionPence: Record<Period, number>;
  pendingSupplierApprovals: number;
  openCsrCases: number;
  activeListings: number;
  ordersToday: number;
  ordersThisWeek: number;
  flaggedShipments: number;
  revenueSeries: { date: string; grossPence: number; commissionPence: number }[];
}

interface ActionQueues {
  pendingSupplierApprovals: Supplier[];
  escalatedCases: CSRCase[];
  slaBreaches: Supplier[];
  shipmentExceptions: Order[];
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  week: 'This week',
  month: 'This month',
};

export function AdminHome() {
  const [period, setPeriod] = React.useState<Period>('week');

  const summary = useQuery({
    queryKey: queryKeys.admin.summary,
    queryFn: () => api.get<AdminSummary>(endpoints.admin.summary),
  });

  const queues = useQuery({
    queryKey: queryKeys.admin.queues,
    queryFn: () => api.get<ActionQueues>(endpoints.admin.actionQueues),
  });

  if (summary.isLoading) return <LoadingState label="Loading dashboard…" />;
  if (summary.isError) {
    return <ErrorState message={errorMessage(summary.error)} onRetry={() => void summary.refetch()} />;
  }

  const data = summary.data!;

  return (
    <>
      <PageHeader
        title="Overview"
        description="Platform health, revenue and anything needing your attention."
        actions={
          <div className="flex gap-1 rounded-lg bg-white p-1 ring-1 ring-slate-200">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                aria-pressed={period === value}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  period === value ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                {PERIOD_LABELS[value]}
              </button>
            ))}
          </div>
        }
      />

      {/* ---- KPIs ---- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={`Gross revenue — ${PERIOD_LABELS[period].toLowerCase()}`}
          value={formatPrice(data.grossRevenuePence[period])}
          tone="positive"
        />
        <StatCard
          label={`Commission earned — ${PERIOD_LABELS[period].toLowerCase()}`}
          value={formatPrice(data.commissionPence[period])}
        />
        <StatCard label="Orders today" value={data.ordersToday} hint={`${data.ordersThisWeek} this week`} />
        <StatCard label="Active catalogue listings" value={data.activeListings} href="/admin/catalogue" />
        <StatCard
          label="Pending supplier approvals"
          value={data.pendingSupplierApprovals}
          tone={data.pendingSupplierApprovals > 0 ? 'warning' : 'neutral'}
          href="/admin/suppliers?status=PENDING"
        />
        <StatCard
          label="Open CSR cases"
          value={data.openCsrCases}
          tone={data.openCsrCases > 0 ? 'danger' : 'neutral'}
          href="/csr/cases"
        />
        <StatCard
          label="Flagged shipments"
          value={data.flaggedShipments}
          tone={data.flaggedShipments > 0 ? 'warning' : 'neutral'}
        />
        <StatCard
          label="Effective commission rate"
          value={
            data.grossRevenuePence[period] > 0
              ? `${((data.commissionPence[period] / data.grossRevenuePence[period]) * 100).toFixed(1)}%`
              : '—'
          }
          hint="Across all categories and tiers"
        />
      </div>

      {/* ---- Revenue chart ---- */}
      <Card className="mt-6">
        <CardHeader
          title="Revenue"
          description="Gross revenue and platform commission over the last 30 days."
        />
        <div className="p-5">
          <RevenueChart series={data.revenueSeries} />
        </div>
      </Card>

      {/* ---- Action queues ---- */}
      <h2 className="mt-8 text-lg font-semibold text-slate-900">Needs your attention</h2>

      {queues.isLoading ? (
        <LoadingState />
      ) : queues.isError ? (
        <ErrorState message={errorMessage(queues.error)} onRetry={() => void queues.refetch()} />
      ) : (
        <div className="mt-4 grid gap-6 xl:grid-cols-2">
          {/* Pending supplier approvals */}
          <QueueCard
            title="Pending supplier approvals"
            href="/admin/suppliers?status=PENDING"
            count={queues.data!.pendingSupplierApprovals.length}
            emptyLabel="No applications waiting"
          >
            {queues.data!.pendingSupplierApprovals.map((supplier) => (
              <QueueRow
                key={supplier.id}
                to={`/admin/suppliers/${supplier.id}`}
                title={supplier.businessName}
                meta={`Applied ${formatDate(supplier.appliedAt)} · ${supplier.registeredAddress.city}`}
                badge={<StatusBadge label="Pending" tone="warning" size="sm" />}
              />
            ))}
          </QueueCard>

          {/* Escalated cases */}
          <QueueCard
            title="Cases escalated to you"
            href="/csr/cases"
            count={queues.data!.escalatedCases.length}
            emptyLabel="Nothing escalated"
            tone="danger"
          >
            {queues.data!.escalatedCases.map((item) => (
              <QueueRow
                key={item.id}
                to={`/csr/cases/${item.id}`}
                title={`${item.reference} · ${item.buyerName}`}
                meta={`Raised ${formatRelative(item.raisedAt)}`}
                badge={<StatusBadge label="Escalated" tone="danger" size="sm" />}
              />
            ))}
          </QueueCard>

          {/* SLA breaches */}
          <QueueCard
            title="Supplier SLA breaches"
            href="/admin/suppliers"
            count={queues.data!.slaBreaches.length}
            emptyLabel="All suppliers within SLA"
            tone="warning"
          >
            {queues.data!.slaBreaches.map((supplier) => (
              <QueueRow
                key={supplier.id}
                to={`/admin/suppliers/${supplier.id}`}
                title={supplier.businessName}
                meta={`${supplier.consecutiveMissedSlas} consecutive missed confirmations · ${(supplier.fulfilmentRate * 100).toFixed(0)}% fulfilment rate`}
                badge={<TierBadge tier={supplier.tier} />}
              />
            ))}
          </QueueCard>

          {/* Shipment exceptions */}
          <QueueCard
            title="Shipment exceptions"
            href="/admin/orders"
            count={queues.data!.shipmentExceptions.length}
            emptyLabel="No delivery problems"
            tone="warning"
          >
            {queues.data!.shipmentExceptions.map((order) => (
              <QueueRow
                key={order.id}
                to={`/admin/orders/${order.id}`}
                title={order.reference}
                meta={`${order.shipment.carrierLabel ?? 'Carrier'} · ${order.shipment.trackingNumber ?? ''}`}
                badge={<StatusBadge label="Exception" tone="danger" size="sm" />}
              />
            ))}
          </QueueCard>
        </div>
      )}
    </>
  );
}

function QueueCard({
  title,
  href,
  count,
  emptyLabel,
  tone,
  children,
}: {
  title: string;
  href: string;
  count: number;
  emptyLabel: string;
  tone?: 'warning' | 'danger';
  children: React.ReactNode;
}) {
  return (
    <Card className={cn(count > 0 && tone === 'danger' && 'border-l-4 border-l-red-500', count > 0 && tone === 'warning' && 'border-l-4 border-l-amber-500')}>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {title}
            {count > 0 && (
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                {count}
              </span>
            )}
          </span>
        }
        action={
          <Link to={href} className="text-sm font-medium text-brand-700 hover:underline">
            View all
          </Link>
        }
      />
      {count === 0 ? (
        <div className="p-5">
          <EmptyState title={emptyLabel} />
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">{children}</ul>
      )}
    </Card>
  );
}

function QueueRow({
  to,
  title,
  meta,
  badge,
}: {
  to: string;
  title: string;
  meta: string;
  badge?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        to={to}
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{title}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">{meta}</p>
        </div>
        {badge}
      </Link>
    </li>
  );
}
