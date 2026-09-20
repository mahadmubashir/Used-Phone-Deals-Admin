import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  DataTable,
  Input,
  ORDER_STATUS_LABELS,
  OrderStatusBadge,
  Select,
  StatusBadge,
  errorMessage,
  formatDate,
  formatPrice,
  type Column,
  type Order,
  type OrderStatus,
  type Paginated,
  type Supplier,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';

export function AdminOrdersPage() {
  const navigate = useNavigate();
  const [status, setStatus] = React.useState('');
  const [supplierId, setSupplierId] = React.useState('');
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
    queryKey: queryKeys.admin.orders({ status, supplierId, search: debounced, page }),
    queryFn: () =>
      api.get<Paginated<Order>>(endpoints.admin.orders, {
        query: {
          status: status || undefined,
          supplierId: supplierId || undefined,
          search: debounced || undefined,
          page,
          pageSize: 15,
        },
      }),
    placeholderData: keepPreviousData,
  });

  const suppliers = useQuery({
    queryKey: queryKeys.admin.suppliers({ all: true }),
    queryFn: () =>
      api.get<Paginated<Supplier>>(endpoints.admin.suppliers, { query: { pageSize: 100 } }),
    staleTime: 5 * 60_000,
  });

  const columns: Column<Order>[] = [
    {
      key: 'reference',
      header: 'Order',
      sortValue: (row) => row.reference,
      render: (row) => (
        <div>
          <p className="font-mono text-sm font-medium text-slate-900">{row.reference}</p>
          {row.isGuest && <StatusBadge label="Guest" tone="neutral" size="sm" className="mt-1" />}
        </div>
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
      key: 'supplierName',
      header: 'Allocated supplier',
      hideOnMobile: true,
      sortValue: (row) => row.supplierName ?? '',
      render: (row) =>
        row.supplierId ? (
          <Link
            to={`/admin/suppliers/${row.supplierId}`}
            className="text-sm text-brand-700 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {row.supplierName}
          </Link>
        ) : (
          <span className="text-xs text-slate-400">Unallocated</span>
        ),
    },
    {
      key: 'shipment',
      header: 'Delivery',
      hideOnMobile: true,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs text-slate-600">
            {row.shipment.carrierLabel ?? 'Not dispatched'}
          </p>
          {row.shipment.status === 'EXCEPTION' && (
            <StatusBadge label="Exception" tone="danger" size="sm" className="mt-1" />
          )}
        </div>
      ),
    },
    {
      key: 'totalPence',
      header: 'Total',
      align: 'right',
      sortValue: (row) => row.totalPence,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{formatPrice(row.totalPence)}</p>
          {row.commissionPence !== undefined && (
            <p className="mt-0.5 text-[11px] text-emerald-700">
              +{formatPrice(row.commissionPence)}
            </p>
          )}
        </div>
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
        title="All orders"
        description="Every order across every supplier, with manual override tools on each one."
      />

      <DataTable
        columns={columns}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => void query.refetch()}
        onRowClick={(row) => navigate(`/admin/orders/${row.id}`)}
        emptyTitle="No orders match"
        emptyDescription="Try clearing a filter or searching for a different reference."
        page={query.data?.page}
        totalPages={query.data?.totalPages}
        onPageChange={setPage}
        caption="All platform orders"
        toolbar={
          <>
            <div className="min-w-0 flex-1 sm:max-w-xs">
              <label htmlFor="admin-order-search" className="sr-only">
                Search orders
              </label>
              <Input
                id="admin-order-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Order reference or buyer email…"
                className="h-9"
              />
            </div>
            <div className="w-full sm:w-44">
              <label htmlFor="admin-order-status" className="sr-only">
                Filter by status
              </label>
              <Select
                id="admin-order-status"
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
            <div className="w-full sm:w-52">
              <label htmlFor="admin-order-supplier" className="sr-only">
                Filter by supplier
              </label>
              <Select
                id="admin-order-supplier"
                value={supplierId}
                onChange={(event) => {
                  setSupplierId(event.target.value);
                  setPage(1);
                }}
                className="h-9"
                options={[
                  { value: '', label: 'All suppliers' },
                  ...(suppliers.data?.data ?? []).map((entry) => ({
                    value: entry.id,
                    label: entry.businessName,
                  })),
                ]}
              />
            </div>
            <p className="ml-auto text-xs text-slate-500">
              {query.data?.total ?? 0} {query.data?.total === 1 ? 'order' : 'orders'}
            </p>
          </>
        }
      />
    </>
  );
}
