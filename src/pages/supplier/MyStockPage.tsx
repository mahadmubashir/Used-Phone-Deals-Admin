import * as React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  ConditionBadge,
  ConfirmationModal,
  DataTable,
  Input,
  Select,
  StatusBadge,
  categoryLabel,
  errorMessage,
  formatDate,
  type Column,
  type Paginated,
  type StockSubmission,
  type StockStatus,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';

const STATUS_TONES = {
  ACTIVE: 'success',
  OUT_OF_STOCK: 'neutral',
  PAUSED: 'warning',
} as const;

const STATUS_LABELS: Record<StockStatus, string> = {
  ACTIVE: 'Active',
  OUT_OF_STOCK: 'Out of stock',
  PAUSED: 'Paused',
};

export function MyStockPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [editing, setEditing] = React.useState<StockSubmission | null>(null);
  const [removing, setRemoving] = React.useState<StockSubmission | null>(null);

  const query = useQuery({
    queryKey: queryKeys.supplier.stock({ status, page }),
    queryFn: () =>
      api.get<Paginated<StockSubmission>>(endpoints.supplier.stock, {
        query: { status: status || undefined, page, pageSize: 15 },
      }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['supplier', 'stock'] });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(endpoints.supplier.stockItem(id)),
    onSuccess: () => {
      invalidate();
      setRemoving(null);
    },
  });

  const columns: Column<StockSubmission>[] = [
    {
      key: 'listingTitle',
      header: 'Product',
      sortValue: (row) => row.listingTitle,
      render: (row) => (
        <div className="min-w-0">
          <p className="font-medium text-slate-900">{row.listingTitle}</p>
          <p className="mt-0.5 text-xs text-slate-500">{categoryLabel(row.category)}</p>
        </div>
      ),
    },
    {
      key: 'identifier',
      header: 'IMEI / Serial',
      hideOnMobile: true,
      render: (row) => (
        <span className="font-mono text-xs text-slate-600">
          {row.imei ?? row.serialNumber ?? '—'}
        </span>
      ),
    },
    {
      key: 'conditionGrade',
      header: 'Grade',
      sortValue: (row) => row.conditionGrade,
      render: (row) => <ConditionBadge grade={row.conditionGrade} size="sm" />,
    },
    {
      key: 'batteryHealthPercent',
      header: 'Battery',
      align: 'right',
      hideOnMobile: true,
      sortValue: (row) => row.batteryHealthPercent ?? 0,
      render: (row) =>
        row.batteryHealthPercent != null ? `${row.batteryHealthPercent}%` : '—',
    },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'right',
      sortValue: (row) => row.quantity,
      render: (row) => <span className="font-medium text-slate-900">{row.quantity}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (row) => row.status,
      render: (row) => (
        <StatusBadge label={STATUS_LABELS[row.status]} tone={STATUS_TONES[row.status]} size="sm" />
      ),
    },
    {
      key: 'updatedAt',
      header: 'Updated',
      hideOnMobile: true,
      sortValue: (row) => row.updatedAt,
      render: (row) => <span className="text-xs text-slate-500">{formatDate(row.updatedAt)}</span>,
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={() => setRemoving(row)}
          >
            Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="My stock"
        description="Every unit you have registered against the catalogue."
        actions={
          <Link to="/supplier/submit-stock">
            <Button>Submit stock</Button>
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
        emptyTitle="No stock submitted yet"
        emptyDescription="Find a catalogue listing and register the units you hold against it."
        emptyAction={
          <Link to="/supplier/submit-stock">
            <Button>Submit your first stock</Button>
          </Link>
        }
        page={query.data?.page}
        totalPages={query.data?.totalPages}
        onPageChange={setPage}
        caption="Your stock submissions"
        toolbar={
          <div className="w-full sm:w-52">
            <label htmlFor="stock-status" className="sr-only">
              Filter by status
            </label>
            <Select
              id="stock-status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="h-9"
              options={[
                { value: '', label: 'All statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'OUT_OF_STOCK', label: 'Out of stock' },
                { value: 'PAUSED', label: 'Paused' },
              ]}
            />
          </div>
        }
      />

      {editing && (
        <EditQuantityModal
          submission={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            invalidate();
            setEditing(null);
          }}
        />
      )}

      <ConfirmationModal
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) remove.mutate(removing.id);
        }}
        title="Remove this stock?"
        description={
          removing
            ? `${removing.listingTitle} (${removing.imei ?? removing.serialNumber}) will be removed from the platform and will no longer be allocated any orders.`
            : ''
        }
        confirmLabel="Remove stock"
        loading={remove.isPending}
        error={remove.isError ? errorMessage(remove.error) : null}
      />
    </>
  );
}

function EditQuantityModal({
  submission,
  onClose,
  onSaved,
}: {
  submission: StockSubmission;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [quantity, setQuantity] = React.useState(String(submission.quantity));
  const [status, setStatus] = React.useState<StockStatus>(submission.status);

  const save = useMutation({
    mutationFn: () =>
      api.patch(endpoints.supplier.stockItem(submission.id), {
        quantity: Number(quantity),
        status,
      }),
    onSuccess: onSaved,
  });

  const invalid = !Number.isInteger(Number(quantity)) || Number(quantity) < 0;

  return (
    <ConfirmationModal
      open
      onClose={onClose}
      onConfirm={() => save.mutate()}
      title="Update stock"
      description={submission.listingTitle}
      confirmLabel="Save changes"
      destructive={false}
      loading={save.isPending}
      error={save.isError ? errorMessage(save.error) : null}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="edit-quantity" className="block text-sm font-medium text-slate-900">
            Quantity
          </label>
          <Input
            id="edit-quantity"
            type="number"
            min={0}
            max={999}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            invalid={invalid}
          />
          {invalid && <p className="text-xs text-red-600">Enter a whole number of units.</p>}
          <p className="text-xs text-slate-500">
            Setting this to 0 marks the submission as out of stock.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="edit-status" className="block text-sm font-medium text-slate-900">
            Status
          </label>
          <Select
            id="edit-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as StockStatus)}
            options={[
              { value: 'ACTIVE', label: 'Active — available for allocation' },
              { value: 'PAUSED', label: 'Paused — temporarily not available' },
              { value: 'OUT_OF_STOCK', label: 'Out of stock' },
            ]}
          />
        </div>
      </div>
    </ConfirmationModal>
  );
}
