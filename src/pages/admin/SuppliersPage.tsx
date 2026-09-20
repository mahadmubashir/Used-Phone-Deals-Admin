import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  Button,
  DataTable,
  SUPPLIER_TIERS,
  Select,
  StatusBadge,
  TierBadge,
  errorMessage,
  formatDate,
  type Column,
  type Paginated,
  type Supplier,
  type SupplierStatus,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';

const STATUS_TONES: Record<SupplierStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  ACTIVE: 'success',
  PENDING: 'warning',
  UNDER_REVIEW: 'warning',
  SUSPENDED: 'danger',
  REJECTED: 'neutral',
};

const STATUS_LABELS: Record<SupplierStatus, string> = {
  ACTIVE: 'Active',
  PENDING: 'Pending approval',
  UNDER_REVIEW: 'Under review',
  SUSPENDED: 'Suspended',
  REJECTED: 'Rejected',
};

export function SuppliersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get('status') ?? '';
  const tier = searchParams.get('tier') ?? '';
  const [page, setPage] = React.useState(1);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
    setPage(1);
  }

  const query = useQuery({
    queryKey: queryKeys.admin.suppliers({ status, tier, page }),
    queryFn: () =>
      api.get<Paginated<Supplier>>(endpoints.admin.suppliers, {
        query: { status: status || undefined, tier: tier || undefined, page, pageSize: 15 },
      }),
    placeholderData: keepPreviousData,
  });

  const pending = (query.data?.data ?? []).filter((s) => s.status === 'PENDING');

  const columns: Column<Supplier>[] = [
    {
      key: 'businessName',
      header: 'Business',
      sortValue: (row) => row.businessName,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{row.businessName}</p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {row.registeredAddress.city} · {row.email}
          </p>
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      sortValue: (row) => row.totalStockUnits,
      render: (row) => <TierBadge tier={row.tier} />,
    },
    {
      key: 'totalStockUnits',
      header: 'Stock units',
      align: 'right',
      sortValue: (row) => row.totalStockUnits,
      render: (row) => <span className="font-medium text-slate-900">{row.totalStockUnits}</span>,
    },
    {
      key: 'fulfilmentRate',
      header: 'Fulfilment',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.fulfilmentRate,
      render: (row) => (
        <span
          className={
            row.fulfilmentRate >= 0.9
              ? 'font-medium text-emerald-700'
              : row.fulfilmentRate >= 0.75
                ? 'font-medium text-amber-700'
                : 'font-medium text-red-700'
          }
        >
          {row.status === 'PENDING' ? '—' : `${(row.fulfilmentRate * 100).toFixed(0)}%`}
        </span>
      ),
    },
    {
      key: 'kyc',
      header: 'Stripe KYC',
      hideOnMobile: true,
      render: (row) => (
        <StatusBadge
          label={row.stripeConnect.kycStatus.replace('_', ' ').toLowerCase()}
          tone={row.stripeConnect.kycStatus === 'VERIFIED' ? 'success' : 'warning'}
          size="sm"
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      render: (row) => (
        <div className="space-y-1">
          <StatusBadge label={STATUS_LABELS[row.status]} tone={STATUS_TONES[row.status]} size="sm" />
          {row.consecutiveMissedSlas >= 3 && (
            <StatusBadge label="SLA breach" tone="danger" size="sm" />
          )}
        </div>
      ),
    },
    {
      key: 'appliedAt',
      header: 'Applied',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.appliedAt,
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.appliedAt)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Applications, approvals and performance across every supplier on the platform."
      />

      {pending.length > 0 && status !== 'PENDING' && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">
            {pending.length} supplier {pending.length === 1 ? 'application is' : 'applications are'}{' '}
            waiting for approval
          </p>
          <Button size="sm" onClick={() => setFilter('status', 'PENDING')}>
            Review applications
          </Button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => void query.refetch()}
        onRowClick={(row) => navigate(`/admin/suppliers/${row.id}`)}
        emptyTitle="No suppliers match"
        emptyDescription="Try clearing the status or tier filter."
        page={query.data?.page}
        totalPages={query.data?.totalPages}
        onPageChange={setPage}
        caption="All suppliers"
        toolbar={
          <>
            <div className="w-full sm:w-48">
              <label htmlFor="supplier-status" className="sr-only">
                Filter by status
              </label>
              <Select
                id="supplier-status"
                value={status}
                onChange={(event) => setFilter('status', event.target.value)}
                className="h-9"
                options={[
                  { value: '', label: 'All statuses' },
                  ...(Object.keys(STATUS_LABELS) as SupplierStatus[]).map((value) => ({
                    value,
                    label: STATUS_LABELS[value],
                  })),
                ]}
              />
            </div>
            <div className="w-full sm:w-40">
              <label htmlFor="supplier-tier" className="sr-only">
                Filter by tier
              </label>
              <Select
                id="supplier-tier"
                value={tier}
                onChange={(event) => setFilter('tier', event.target.value)}
                className="h-9"
                options={[
                  { value: '', label: 'All tiers' },
                  ...SUPPLIER_TIERS.map((entry) => ({ value: entry.value, label: entry.label })),
                ]}
              />
            </div>
            <p className="ml-auto text-xs text-slate-500">
              {query.data?.total ?? 0} {query.data?.total === 1 ? 'supplier' : 'suppliers'}
            </p>
          </>
        }
      />
    </>
  );
}
