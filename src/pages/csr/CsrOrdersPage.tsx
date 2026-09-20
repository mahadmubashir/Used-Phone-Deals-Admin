import * as React from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  DataTable,
  Input,
  ORDER_STATUS_LABELS,
  OrderStatusBadge,
  Select,
  errorMessage,
  formatDate,
  formatPrice,
  type Column,
  type Order,
  type OrderStatus,
  type Paginated,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';

/**
 * Orders as the CSR team sees them: full visibility for context, but no
 * catalogue, supplier-account, commission or financial-reporting controls.
 * Status changes are made from within a case, not from here.
 */
export function CsrOrdersPage() {
  const [status, setStatus] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const query = useQuery({
    queryKey: queryKeys.csr.orders({ status, search: debounced, page }),
    queryFn: () =>
      api.get<Paginated<Order>>(endpoints.csr.orders, {
        query: { status: status || undefined, search: debounced || undefined, page, pageSize: 15 },
      }),
    placeholderData: keepPreviousData,
  });

  const columns: Column<Order>[] = [
    {
      key: 'reference',
      header: 'Order',
      sortValue: (row) => row.reference,
      render: (row) => (
        <span className="font-mono text-sm font-medium text-slate-900">{row.reference}</span>
      ),
    },
    {
      key: 'buyer',
      header: 'Buyer',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{row.buyerName}</p>
          <p className="truncate text-xs text-slate-500">{row.buyerEmail}</p>
        </div>
      ),
    },
    {
      key: 'item',
      header: 'Product',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-slate-700">
          {row.items[0]?.title}
          {row.items.length > 1 && ` +${row.items.length - 1}`}
        </span>
      ),
    },
    {
      key: 'tracking',
      header: 'Tracking',
      hideOnMobile: true,
      render: (row) => (
        <span className="font-mono text-xs text-slate-600">
          {row.shipment.trackingNumber ?? '—'}
        </span>
      ),
    },
    {
      key: 'totalPence',
      header: 'Total',
      align: 'right',
      sortValue: (row) => row.totalPence,
      render: (row) => (
        <span className="font-medium text-slate-900">{formatPrice(row.totalPence)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      render: (row) => <OrderStatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'placedAt',
      header: 'Placed',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.placedAt,
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.placedAt)}</span>,
    },
  ];

  return (
    <>
      <PageHeader
        title="Orders"
        description="Read-only order lookup for case context. Actions are taken from within a case."
      />

      <DataTable
        columns={columns}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => void query.refetch()}
        emptyTitle="No orders match"
        emptyDescription="Try a different order reference or buyer email."
        page={query.data?.page}
        totalPages={query.data?.totalPages}
        onPageChange={setPage}
        caption="All orders"
        toolbar={
          <>
            <div className="min-w-0 flex-1 sm:max-w-xs">
              <label htmlFor="order-search" className="sr-only">
                Search orders
              </label>
              <Input
                id="order-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Order reference or buyer email…"
                className="h-9"
              />
            </div>
            <div className="w-full sm:w-48">
              <label htmlFor="order-status" className="sr-only">
                Filter by status
              </label>
              <Select
                id="order-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="h-9"
                options={[
                  { value: '', label: 'All statuses' },
                  ...(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((value) => ({
                    value,
                    label: ORDER_STATUS_LABELS[value],
                  })),
                ]}
              />
            </div>
          </>
        }
      />
    </>
  );
}
