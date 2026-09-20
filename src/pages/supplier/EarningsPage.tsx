import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardHeader,
  DataTable,
  ErrorState,
  LoadingState,
  SLA,
  StatusBadge,
  errorMessage,
  formatDate,
  formatPrice,
  type Column,
  type Payout,
  type SupplierEarnings,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';
import { StatCard } from '@/components/StatCard';

const PAYOUT_TONES = {
  PENDING: 'neutral',
  IN_TRANSIT: 'progress',
  PAID: 'success',
  FAILED: 'danger',
} as const;

const PAYOUT_LABELS = {
  PENDING: 'Pending',
  IN_TRANSIT: 'In transit',
  PAID: 'Paid',
  FAILED: 'Failed',
} as const;

export function EarningsPage() {
  const query = useQuery({
    queryKey: queryKeys.supplier.earnings,
    queryFn: () => api.get<SupplierEarnings>(endpoints.supplier.earnings),
  });

  if (query.isLoading) return <LoadingState label="Loading your earnings…" />;
  if (query.isError) {
    return <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />;
  }

  const earnings = query.data!;
  const commissionRate =
    earnings.grossSalesPence > 0
      ? ((earnings.commissionPence / earnings.grossSalesPence) * 100).toFixed(1)
      : '—';

  const columns: Column<Payout>[] = [
    {
      key: 'period',
      header: 'Period',
      render: (row) => (
        <span className="text-sm text-slate-900">
          {formatDate(row.periodStart)} – {formatDate(row.periodEnd)}
        </span>
      ),
    },
    {
      key: 'amountPence',
      header: 'Amount',
      align: 'right',
      sortValue: (row) => row.amountPence,
      render: (row) => (
        <span className="font-medium text-slate-900">{formatPrice(row.amountPence)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      render: (row) => (
        <StatusBadge label={PAYOUT_LABELS[row.status]} tone={PAYOUT_TONES[row.status]} size="sm" />
      ),
    },
    {
      key: 'releasedAt',
      header: 'Released',
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.releasedAt ? formatDate(row.releasedAt) : 'Awaiting release'}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Earnings"
        description="Your sales, the platform commission deducted, and what has been paid out."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Gross sales" value={formatPrice(earnings.grossSalesPence)} />
        <StatCard
          label="Platform commission"
          value={`−${formatPrice(earnings.commissionPence)}`}
          hint={`${commissionRate}% effective rate`}
        />
        <StatCard
          label="Net earnings"
          value={formatPrice(earnings.netEarningsPence)}
          tone="positive"
        />
        <StatCard
          label="Pending payout"
          value={formatPrice(earnings.pendingPayoutPence)}
          hint="Held in escrow"
          tone="warning"
        />
      </div>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-slate-900">How and when you get paid</h2>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
          <li>
            Funds for each order are held in escrow until the buyer&apos;s {SLA.returnWindowDays}-day
            return window closes.
          </li>
          <li>
            Platform commission (between 5% and 15%, depending on the product category and your
            supplier tier) is deducted before payout.
          </li>
          <li>
            The balance is released automatically to your verified Stripe Connect account — you do
            not need to raise an invoice.
          </li>
        </ul>
      </Card>

      <div className="mt-6">
        <CardHeader title="Payout history" className="mb-3 rounded-t-xl border border-b-0 border-slate-200 bg-white" />
        <DataTable
          columns={columns}
          rows={earnings.payouts}
          rowKey={(row) => row.id}
          emptyTitle="No payouts yet"
          emptyDescription="Your first payout will appear once an order's return window has closed."
          caption="Your payout history"
          className="rounded-t-none"
        />
      </div>
    </>
  );
}
