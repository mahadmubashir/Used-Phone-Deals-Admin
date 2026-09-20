import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  CASE_STATUS_LABELS,
  CASE_TYPE_LABELS,
  CaseStatusBadge,
  DataTable,
  Input,
  Select,
  StatusBadge,
  errorMessage,
  formatDate,
  formatRelative,
  truncate,
  type CSRCase,
  type CaseStatus,
  type CaseType,
  type Column,
  type Paginated,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...(Object.keys(CASE_STATUS_LABELS) as CaseStatus[]).map((status) => ({
    value: status,
    label: CASE_STATUS_LABELS[status],
  })),
];

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  ...(Object.keys(CASE_TYPE_LABELS) as CaseType[]).map((type) => ({
    value: type,
    label: CASE_TYPE_LABELS[type],
  })),
];

export function CsrQueuePage() {
  const navigate = useNavigate();
  const [status, setStatus] = React.useState('');
  const [type, setType] = React.useState('');
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
    queryKey: queryKeys.csr.cases({ status, type, search: debounced, page }),
    queryFn: () =>
      api.get<Paginated<CSRCase>>(endpoints.csr.cases, {
        query: {
          status: status || undefined,
          type: type || undefined,
          search: debounced || undefined,
          page,
          pageSize: 15,
        },
      }),
    placeholderData: keepPreviousData,
  });

  const columns: Column<CSRCase>[] = [
    {
      key: 'reference',
      header: 'Case',
      sortValue: (row) => row.reference,
      render: (row) => (
        <div className="min-w-0">
          <p className="font-mono text-sm font-medium text-slate-900">{row.reference}</p>
          {row.escalatedToAdmin && (
            <StatusBadge label="Escalated" tone="danger" size="sm" className="mt-1" />
          )}
        </div>
      ),
    },
    {
      key: 'buyerName',
      header: 'Buyer',
      sortValue: (row) => row.buyerName,
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{row.buyerName}</p>
          <p className="truncate text-xs text-slate-500">{row.buyerEmail}</p>
        </div>
      ),
    },
    {
      key: 'orderReference',
      header: 'Order',
      hideOnMobile: true,
      sortValue: (row) => row.orderReference,
      render: (row) => <span className="font-mono text-xs text-slate-600">{row.orderReference}</span>,
    },
    {
      key: 'type',
      header: 'Issue type',
      sortValue: (row) => row.type,
      render: (row) => (
        <div className="min-w-0">
          <p className="text-sm text-slate-900">{CASE_TYPE_LABELS[row.type]}</p>
          <p className="truncate text-xs text-slate-500">{truncate(row.description, 48)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      render: (row) => <CaseStatusBadge status={row.status} size="sm" />,
    },
    {
      key: 'raisedAt',
      header: 'Raised',
      hideOnMobile: true,
      sortValue: (row) => row.raisedAt,
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.raisedAt)}</span>,
    },
    {
      key: 'updatedAt',
      header: 'Last updated',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.updatedAt,
      render: (row) => (
        <span className="text-xs text-slate-500">{formatRelative(row.updatedAt)}</span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Case queue"
        description="Every buyer support case across the platform."
      />

      <DataTable
        columns={columns}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => void query.refetch()}
        onRowClick={(row) => navigate(`/csr/cases/${row.id}`)}
        emptyTitle="No cases match those filters"
        emptyDescription="Try clearing a filter or searching for a different order reference."
        page={query.data?.page}
        totalPages={query.data?.totalPages}
        onPageChange={setPage}
        caption="Customer service case queue"
        toolbar={
          <>
            <div className="min-w-0 flex-1 sm:max-w-xs">
              <label htmlFor="case-search" className="sr-only">
                Search by order number or buyer email
              </label>
              <Input
                id="case-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Order ref, case ref or buyer email…"
                className="h-9"
              />
            </div>
            <div className="w-full sm:w-48">
              <label htmlFor="case-status" className="sr-only">
                Filter by status
              </label>
              <Select
                id="case-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                options={STATUS_OPTIONS}
                className="h-9"
              />
            </div>
            <div className="w-full sm:w-44">
              <label htmlFor="case-type" className="sr-only">
                Filter by issue type
              </label>
              <Select
                id="case-type"
                value={type}
                onChange={(event) => {
                  setType(event.target.value);
                  setPage(1);
                }}
                options={TYPE_OPTIONS}
                className="h-9"
              />
            </div>
            <p className="ml-auto text-xs text-slate-500">
              {query.data?.total ?? 0} {query.data?.total === 1 ? 'case' : 'cases'}
            </p>
          </>
        }
      />
    </>
  );
}
