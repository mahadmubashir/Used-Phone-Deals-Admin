import * as React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardHeader,
  DataTable,
  Field,
  Input,
  TierBadge,
  cn,
  errorMessage,
  formatDate,
  formatPrice,
  type Column,
  type SupplierTier,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';

type ReportKey = 'sales' | 'commission' | 'supplier-performance';

const REPORTS: { key: ReportKey; label: string; description: string }[] = [
  {
    key: 'sales',
    label: 'Sales',
    description: 'Orders, gross revenue, returns and net revenue by day.',
  },
  {
    key: 'commission',
    label: 'Commission',
    description: 'Commission earned per supplier for the selected period.',
  },
  {
    key: 'supplier-performance',
    label: 'Supplier performance',
    description: 'Order volume, return rate, average rating and SLA compliance.',
  },
];

interface SalesRow {
  date: string;
  orders: number;
  grossPence: number;
  returnsPence: number;
  netPence: number;
}

interface CommissionRow {
  supplierId: string;
  supplierName: string;
  tier: SupplierTier;
  orders: number;
  grossPence: number;
  commissionPence: number;
}

interface PerformanceRow {
  supplierId: string;
  supplierName: string;
  orderVolume: number;
  returnRatePercent: number;
  avgRating: number;
  slaCompliancePercent: number;
}

export function ReportsPage() {
  const [report, setReport] = React.useState<ReportKey>('sales');
  const [from, setFrom] = React.useState(defaultFrom());
  const [to, setTo] = React.useState(today());

  const query = useQuery({
    queryKey: queryKeys.admin.report(report, { from, to }),
    queryFn: () => {
      const url = {
        sales: endpoints.admin.reports.sales,
        commission: endpoints.admin.reports.commission,
        'supplier-performance': endpoints.admin.reports.supplierPerformance,
      }[report];
      return api.get<{ rows: unknown[] }>(url, { query: { from, to } });
    },
  });

  const exportCsv = useMutation({
    mutationFn: async () => {
      const blob = await api.downloadCsv(endpoints.admin.reports.export(report), { from, to });
      // Trigger the browser download without leaving the page.
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `upd-${report}-${from}-to-${to}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
  });

  const active = REPORTS.find((entry) => entry.key === report)!;

  return (
    <>
      <PageHeader
        title="Reports & exports"
        description="Platform reporting. Every report can be exported as CSV for your accountant."
        actions={
          <Button loading={exportCsv.isPending} onClick={() => exportCsv.mutate()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Export CSV
          </Button>
        }
      />

      {/* ---- Report picker ---- */}
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {REPORTS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setReport(entry.key)}
            aria-pressed={report === entry.key}
            className={cn(
              'rounded-xl border-2 p-4 text-left transition-colors',
              report === entry.key
                ? 'border-brand-600 bg-brand-50'
                : 'border-slate-200 bg-white hover:border-slate-300',
            )}
          >
            <p className="text-sm font-semibold text-slate-900">{entry.label}</p>
            <p className="mt-1 text-xs text-slate-600">{entry.description}</p>
          </button>
        ))}
      </div>

      {/* ---- Date range ---- */}
      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-4 p-5">
          <Field id="from" label="From" className="w-full sm:w-44">
            <Input id="from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <Field id="to" label="To" className="w-full sm:w-44">
            <Input id="to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </Field>
          <div className="flex gap-2 pb-0.5">
            <Button variant="outline" size="sm" onClick={() => { setFrom(daysAgo(7)); setTo(today()); }}>
              Last 7 days
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setFrom(daysAgo(30)); setTo(today()); }}>
              Last 30 days
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setFrom(daysAgo(90)); setTo(today()); }}>
              Last 90 days
            </Button>
          </div>
        </div>
      </Card>

      {exportCsv.isError && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800">
          {errorMessage(exportCsv.error)}
        </p>
      )}

      <CardHeader
        title={`${active.label} report`}
        description={`${formatDate(from)} – ${formatDate(to)}`}
        className="rounded-t-xl border border-b-0 border-slate-200 bg-white"
      />

      {report === 'sales' && (
        <DataTable
          columns={SALES_COLUMNS}
          rows={(query.data?.rows ?? []) as SalesRow[]}
          rowKey={(row) => row.date}
          loading={query.isLoading}
          error={query.isError ? errorMessage(query.error) : null}
          onRetry={() => void query.refetch()}
          emptyTitle="No sales in this period"
          caption="Sales report"
          className="rounded-t-none"
        />
      )}

      {report === 'commission' && (
        <DataTable
          columns={COMMISSION_COLUMNS}
          rows={(query.data?.rows ?? []) as CommissionRow[]}
          rowKey={(row) => row.supplierId}
          loading={query.isLoading}
          error={query.isError ? errorMessage(query.error) : null}
          onRetry={() => void query.refetch()}
          emptyTitle="No commission in this period"
          caption="Commission report"
          className="rounded-t-none"
        />
      )}

      {report === 'supplier-performance' && (
        <DataTable
          columns={PERFORMANCE_COLUMNS}
          rows={(query.data?.rows ?? []) as PerformanceRow[]}
          rowKey={(row) => row.supplierId}
          loading={query.isLoading}
          error={query.isError ? errorMessage(query.error) : null}
          onRetry={() => void query.refetch()}
          emptyTitle="No supplier activity in this period"
          caption="Supplier performance report"
          className="rounded-t-none"
        />
      )}
    </>
  );
}

const SALES_COLUMNS: Column<SalesRow>[] = [
  { key: 'date', header: 'Date', sortValue: (r) => r.date, render: (r) => formatDate(r.date) },
  { key: 'orders', header: 'Orders', align: 'right', sortValue: (r) => r.orders },
  {
    key: 'grossPence',
    header: 'Gross revenue',
    align: 'right',
    sortValue: (r) => r.grossPence,
    render: (r) => formatPrice(r.grossPence),
  },
  {
    key: 'returnsPence',
    header: 'Returns',
    align: 'right',
    sortValue: (r) => r.returnsPence,
    render: (r) => <span className="text-red-700">−{formatPrice(r.returnsPence)}</span>,
  },
  {
    key: 'netPence',
    header: 'Net revenue',
    align: 'right',
    sortValue: (r) => r.netPence,
    render: (r) => <span className="font-semibold text-slate-900">{formatPrice(r.netPence)}</span>,
  },
];

const COMMISSION_COLUMNS: Column<CommissionRow>[] = [
  { key: 'supplierName', header: 'Supplier', sortValue: (r) => r.supplierName },
  {
    key: 'tier',
    header: 'Tier',
    sortValue: (r) => r.tier,
    render: (r) => <TierBadge tier={r.tier} />,
  },
  { key: 'orders', header: 'Orders', align: 'right', sortValue: (r) => r.orders },
  {
    key: 'grossPence',
    header: 'Gross',
    align: 'right',
    sortValue: (r) => r.grossPence,
    render: (r) => formatPrice(r.grossPence),
  },
  {
    key: 'commissionPence',
    header: 'Commission earned',
    align: 'right',
    sortValue: (r) => r.commissionPence,
    render: (r) => (
      <span className="font-semibold text-emerald-700">{formatPrice(r.commissionPence)}</span>
    ),
  },
];

const PERFORMANCE_COLUMNS: Column<PerformanceRow>[] = [
  { key: 'supplierName', header: 'Supplier', sortValue: (r) => r.supplierName },
  { key: 'orderVolume', header: 'Order volume', align: 'right', sortValue: (r) => r.orderVolume },
  {
    key: 'returnRatePercent',
    header: 'Return rate',
    align: 'right',
    sortValue: (r) => r.returnRatePercent,
    render: (r) => (
      <span className={r.returnRatePercent > 6 ? 'font-medium text-red-700' : 'text-slate-700'}>
        {r.returnRatePercent}%
      </span>
    ),
  },
  {
    key: 'avgRating',
    header: 'Avg rating',
    align: 'right',
    sortValue: (r) => r.avgRating,
    render: (r) => r.avgRating.toFixed(1),
  },
  {
    key: 'slaCompliancePercent',
    header: 'SLA compliance',
    align: 'right',
    sortValue: (r) => r.slaCompliancePercent,
    render: (r) => (
      <span
        className={
          r.slaCompliancePercent >= 90
            ? 'font-medium text-emerald-700'
            : r.slaCompliancePercent >= 75
              ? 'font-medium text-amber-700'
              : 'font-medium text-red-700'
        }
      >
        {r.slaCompliancePercent}%
      </span>
    ),
  },
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function defaultFrom(): string {
  return daysAgo(30);
}
