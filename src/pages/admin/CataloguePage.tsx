import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  Button,
  ConditionBadge,
  ConfirmationModal,
  DataTable,
  Input,
  Select,
  StatusBadge,
  CATEGORIES,
  categoryLabel,
  errorMessage,
  formatPrice,
  type CatalogueListing,
  type Column,
  type Paginated,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';

/**
 * Master catalogue management — Admin only.
 *
 * Everything a buyer sees about a product originates here: the title, the
 * description, the photos and the price. Suppliers have no write access to any
 * of it and cannot see pricing at all.
 */
export function CataloguePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [deleting, setDeleting] = React.useState<CatalogueListing | null>(null);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const query = useQuery({
    queryKey: queryKeys.admin.catalogue({ debounced, category, status, page }),
    queryFn: () =>
      api.get<Paginated<CatalogueListing>>(endpoints.catalogue.create, {
        query: {
          search: debounced || undefined,
          category: category || undefined,
          status: status || undefined,
          page,
          pageSize: 15,
        },
      }),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin', 'catalogue'] });

  const setListingStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: CatalogueListing['status'] }) =>
      api.patch(endpoints.catalogue.update(id), { status: next }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(endpoints.catalogue.remove(id)),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
    },
  });

  const columns: Column<CatalogueListing>[] = [
    {
      key: 'title',
      header: 'Listing',
      sortValue: (row) => row.title,
      render: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          <img
            src={row.images[0]?.url}
            alt=""
            className="h-11 w-11 shrink-0 rounded-lg bg-slate-50 object-contain p-1"
          />
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{row.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {categoryLabel(row.category)} · {row.images.length} photos
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'pricePence',
      header: 'Price',
      align: 'right',
      sortValue: (row) => row.pricePence,
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{formatPrice(row.pricePence)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {row.vatScheme === 'MARGIN' ? 'Margin' : 'Standard VAT'}
          </p>
        </div>
      ),
    },
    {
      key: 'totalStock',
      header: 'Stock',
      align: 'right',
      sortValue: (row) => row.totalStock,
      render: (row) =>
        row.totalStock > 0 ? (
          <div>
            <p className="font-medium text-slate-900">{row.totalStock}</p>
            {row.bestAvailableGrade && (
              <div className="mt-1 flex justify-end">
                <ConditionBadge grade={row.bestAvailableGrade} size="sm" withDot={false} />
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-slate-400">0</p>
            {Boolean(row.notifyMeCount) && (
              <p className="mt-0.5 text-[11px] font-medium text-amber-700">
                {row.notifyMeCount} waiting
              </p>
            )}
          </div>
        ),
    },
    {
      key: 'rating',
      header: 'Rating',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.rating,
      render: (row) =>
        row.reviewCount > 0 ? (
          <span className="text-sm text-slate-700">
            {row.rating.toFixed(1)}{' '}
            <span className="text-xs text-slate-400">({row.reviewCount})</span>
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      render: (row) => (
        <StatusBadge
          label={row.status === 'PUBLISHED' ? 'Published' : row.status === 'PAUSED' ? 'Paused' : 'Draft'}
          tone={row.status === 'PUBLISHED' ? 'success' : row.status === 'PAUSED' ? 'warning' : 'neutral'}
          size="sm"
        />
      ),
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Link to={`/admin/catalogue/${row.id}`}>
            <Button variant="ghost" size="sm">
              Edit
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setListingStatus.mutate({
                id: row.id,
                next: row.status === 'PUBLISHED' ? 'PAUSED' : 'PUBLISHED',
              })
            }
          >
            {row.status === 'PUBLISHED' ? 'Pause' : 'Publish'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setDeleting(row)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Product catalogue"
        description="Every listing on the buyer site. Admin-created and Admin-priced — suppliers submit stock against these entries."
        actions={
          <Link to="/admin/catalogue/new">
            <Button>Create listing</Button>
          </Link>
        }
      />

      <DataTable
        columns={columns}
        rows={query.data?.data ?? []}
        rowKey={(row) => row.id}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        onRetry={() => void query.refetch()}
        onRowClick={(row) => navigate(`/admin/catalogue/${row.id}`)}
        emptyTitle="No listings match"
        emptyDescription="Try clearing the filters, or create the first listing for this category."
        emptyAction={
          <Link to="/admin/catalogue/new">
            <Button>Create listing</Button>
          </Link>
        }
        page={query.data?.page}
        totalPages={query.data?.totalPages}
        onPageChange={setPage}
        caption="Master product catalogue"
        toolbar={
          <>
            <div className="min-w-0 flex-1 sm:max-w-xs">
              <label htmlFor="catalogue-search" className="sr-only">
                Search listings
              </label>
              <Input
                id="catalogue-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by title…"
                className="h-9"
              />
            </div>
            <div className="w-full sm:w-44">
              <label htmlFor="catalogue-category" className="sr-only">
                Filter by category
              </label>
              <Select
                id="catalogue-category"
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(1);
                }}
                className="h-9"
                options={[
                  { value: '', label: 'All categories' },
                  ...CATEGORIES.map((entry) => ({ value: entry.slug, label: entry.label })),
                ]}
              />
            </div>
            <div className="w-full sm:w-36">
              <label htmlFor="catalogue-status" className="sr-only">
                Filter by status
              </label>
              <Select
                id="catalogue-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className="h-9"
                options={[
                  { value: '', label: 'All statuses' },
                  { value: 'PUBLISHED', label: 'Published' },
                  { value: 'PAUSED', label: 'Paused' },
                  { value: 'DRAFT', label: 'Draft' },
                ]}
              />
            </div>
          </>
        }
      />

      <ConfirmationModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id);
        }}
        title="Delete this listing?"
        description={
          deleting
            ? `"${deleting.title}" will be removed from the buyer site permanently. Any supplier stock registered against it will be orphaned. Pausing the listing is usually the safer option.`
            : ''
        }
        confirmLabel="Delete permanently"
        confirmationPhrase="DELETE"
        loading={remove.isPending}
        error={remove.isError ? errorMessage(remove.error) : null}
      />
    </>
  );
}
