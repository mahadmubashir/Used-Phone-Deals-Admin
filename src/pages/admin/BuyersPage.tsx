import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  DataTable,
  Input,
  Select,
  StatusBadge,
  errorMessage,
  formatDate,
  formatPrice,
  type Buyer,
  type Column,
  type Paginated,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';

export function BuyersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [page, setPage] = React.useState(1);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const query = useQuery({
    queryKey: queryKeys.admin.buyers({ debounced, status, page }),
    queryFn: () =>
      api.get<Paginated<Buyer>>(endpoints.admin.buyers, {
        query: { search: debounced || undefined, status: status || undefined, page, pageSize: 15 },
      }),
    placeholderData: keepPreviousData,
  });

  const columns: Column<Buyer>[] = [
    {
      key: 'name',
      header: 'Buyer',
      sortValue: (row) => `${row.lastName} ${row.firstName}`,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">
            {row.firstName} {row.lastName}
          </p>
          <p className="truncate text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'orderCount',
      header: 'Orders',
      align: 'right',
      sortValue: (row) => row.orderCount,
      render: (row) => <span className="font-medium text-slate-900">{row.orderCount}</span>,
    },
    {
      key: 'totalSpentPence',
      header: 'Lifetime value',
      align: 'right',
      sortValue: (row) => row.totalSpentPence,
      render: (row) => (
        <span className="font-medium text-slate-900">{formatPrice(row.totalSpentPence)}</span>
      ),
    },
    {
      key: 'registeredAt',
      header: 'Registered',
      hideOnMobile: true,
      sortValue: (row) => row.registeredAt,
      render: (row) => (
        <span className="text-xs text-slate-500">{formatDate(row.registeredAt)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      render: (row) => (
        <StatusBadge
          label={row.status === 'ACTIVE' ? 'Active' : 'Suspended'}
          tone={row.status === 'ACTIVE' ? 'success' : 'danger'}
          size="sm"
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Buyers" description="Every registered buyer account on the platform." />

      <DataTable
        columns={columns}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => void query.refetch()}
        onRowClick={(row) => navigate(`/admin/buyers/${row.id}`)}
        emptyTitle="No buyers match"
        emptyDescription="Try a different name or email address."
        page={query.data?.page}
        totalPages={query.data?.totalPages}
        onPageChange={setPage}
        caption="Registered buyers"
        toolbar={
          <>
            <div className="min-w-0 flex-1 sm:max-w-xs">
              <label htmlFor="buyer-search" className="sr-only">
                Search buyers
              </label>
              <Input
                id="buyer-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or email…"
                className="h-9"
              />
            </div>
            <div className="w-full sm:w-40">
              <label htmlFor="buyer-status" className="sr-only">
                Filter by status
              </label>
              <Select
                id="buyer-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="h-9"
                options={[
                  { value: '', label: 'All statuses' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'SUSPENDED', label: 'Suspended' },
                ]}
              />
            </div>
            <p className="ml-auto text-xs text-slate-500">
              {query.data?.total ?? 0} {query.data?.total === 1 ? 'buyer' : 'buyers'}
            </p>
          </>
        }
      />
    </>
  );
}
