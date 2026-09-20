import * as React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  ConditionBadge,
  DataTable,
  OrderStatusBadge,
  SLA,
  StatusBadge,
  cn,
  errorMessage,
  formatCountdown,
  formatDate,
  formatPostcode,
  SUPPLIER_ORDER_FILTERS,
  type Column,
  type Order,
  type Paginated,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';

export function SupplierOrdersPage() {
  const [status, setStatus] = React.useState('');
  const [page, setPage] = React.useState(1);

  const query = useQuery({
    queryKey: queryKeys.supplier.orders({ status, page }),
    queryFn: () =>
      api.get<Paginated<Order>>(endpoints.supplier.orders, {
        query: { status: status || undefined, page, pageSize: 15 },
      }),
    // SLA countdowns are only useful if they move.
    refetchInterval: 60_000,
  });

  const columns: Column<Order>[] = [
    {
      key: 'reference',
      header: 'Order',
      sortValue: (row) => row.reference,
      render: (row) => (
        <Link
          to={`/supplier/orders/${row.id}`}
          className="font-mono text-sm font-medium text-brand-700 hover:underline"
        >
          {row.reference}
        </Link>
      ),
    },
    {
      key: 'item',
      header: 'Product',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{row.items[0]?.title}</p>
          {row.items[0] && (
            <div className="mt-1">
              <ConditionBadge grade={row.items[0].conditionGrade} size="sm" withDot={false} />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'deliveryPostcode',
      header: 'Deliver to',
      hideOnMobile: true,
      // Postcode only — suppliers never receive the full buyer address.
      render: (row) => (
        <span className="font-mono text-xs text-slate-600">
          {formatPostcode(row.deliveryPostcode)}
        </span>
      ),
    },
    {
      key: 'placedAt',
      header: 'Placed',
      hideOnMobile: true,
      sortValue: (row) => row.placedAt,
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.placedAt)}</span>,
    },
    {
      key: 'sla',
      header: 'Confirm by',
      render: (row) => {
        if (row.status !== 'PLACED' || !row.confirmationDueAt) {
          return <span className="text-xs text-slate-400">—</span>;
        }
        const sla = formatCountdown(row.confirmationDueAt);
        return (
          <StatusBadge
            label={sla.text}
            tone={sla.overdue ? 'danger' : sla.urgent ? 'warning' : 'neutral'}
            size="sm"
          />
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      render: (row) => <OrderStatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (row) => (
        <Link to={`/supplier/orders/${row.id}`}>
          <Button variant="outline" size="sm">
            {row.status === 'PLACED' ? 'Confirm' : row.status === 'CONFIRMED' ? 'Dispatch' : 'View'}
          </Button>
        </Link>
      ),
    },
  ];

  const pending = (query.data?.data ?? []).filter((order) => order.status === 'PLACED').length;

  return (
    <>
      <PageHeader
        title="Orders"
        description={`Orders allocated to you by the platform. Confirm within ${SLA.supplierOrderConfirmationDays} business day or the order is reallocated automatically.`}
      />

      {pending > 0 && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-900">
            {pending} {pending === 1 ? 'order is' : 'orders are'} waiting for your confirmation
          </p>
          <p className="mt-0.5 text-xs text-amber-800">
            Missing three consecutive confirmation SLAs excludes you from further allocations until
            the Super Admin reinstates your account.
          </p>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => void query.refetch()}
        emptyTitle="No orders here"
        emptyDescription="Orders the allocation algorithm assigns to you will appear here."
        page={query.data?.page}
        totalPages={query.data?.totalPages}
        onPageChange={setPage}
        caption="Orders allocated to you"
        toolbar={
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter orders by status">
            <FilterChip label="All" active={status === ''} onClick={() => setStatus('')} />
            {SUPPLIER_ORDER_FILTERS.map((filter) => (
              <FilterChip
                key={filter.value}
                label={filter.label}
                active={status === filter.value}
                onClick={() => {
                  setStatus(filter.value);
                  setPage(1);
                }}
              />
            ))}
          </div>
        }
      />
    </>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
        active ? 'bg-brand-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
      )}
    >
      {label}
    </button>
  );
}
