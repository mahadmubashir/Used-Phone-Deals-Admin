import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardHeader,
  ConfirmationModal,
  ErrorState,
  LoadingState,
  SLA,
  StatusBadge,
  SUPPLIER_TIER_MAP,
  errorMessage,
  formatDate,
  type Supplier,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';
import { StatCard } from '@/components/StatCard';

type Action = 'approve' | 'reject' | 'suspend' | 'reactivate' | null;

export function SupplierDetailPage() {
  const { id = '' } = useParams();
  const queryClient = useQueryClient();
  const [action, setAction] = React.useState<Action>(null);
  const [note, setNote] = React.useState('');

  const query = useQuery({
    queryKey: queryKeys.admin.supplier(id),
    queryFn: () => api.get<Supplier>(endpoints.admin.supplier(id)),
  });

  const mutate = useMutation({
    mutationFn: (kind: Exclude<Action, null>) => {
      const url = {
        approve: endpoints.admin.approveSupplier(id),
        reject: endpoints.admin.rejectSupplier(id),
        suspend: endpoints.admin.suspendSupplier(id),
        reactivate: endpoints.admin.reactivateSupplier(id),
      }[kind];
      return api.post<Supplier>(url, { note });
    },
    onSuccess: (supplier) => {
      queryClient.setQueryData(queryKeys.admin.supplier(id), supplier);
      queryClient.invalidateQueries({ queryKey: ['admin', 'suppliers'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.queues });
      setAction(null);
      setNote('');
    },
  });

  if (query.isLoading) return <LoadingState label="Loading supplier…" />;
  if (query.isError) {
    return <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />;
  }

  const supplier = query.data!;
  const tier = SUPPLIER_TIER_MAP[supplier.tier];
  const isPending = supplier.status === 'PENDING';

  return (
    <>
      <Link to="/admin/suppliers" className="text-sm font-medium text-brand-700 hover:underline">
        ← Back to suppliers
      </Link>

      <div className="mt-3">
        <PageHeader
          title={supplier.businessName}
          description={`Applied ${formatDate(supplier.appliedAt)}${
            supplier.approvedAt ? ` · Approved ${formatDate(supplier.approvedAt)}` : ''
          }`}
          tier={supplier.tier}
          actions={
            <div className="flex flex-wrap gap-2">
              {isPending ? (
                <>
                  <Button onClick={() => setAction('approve')}>Approve</Button>
                  <Button variant="outline" onClick={() => setAction('reject')}>
                    Reject
                  </Button>
                </>
              ) : supplier.status === 'SUSPENDED' ? (
                <Button onClick={() => setAction('reactivate')}>Reactivate account</Button>
              ) : (
                <Button variant="danger" onClick={() => setAction('suspend')}>
                  Suspend account
                </Button>
              )}
            </div>
          }
        />
      </div>

      {/* ---- SLA warning ---- */}
      {supplier.consecutiveMissedSlas >= 3 && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-900">
            Excluded from order allocation — {supplier.consecutiveMissedSlas} consecutive missed
            confirmation SLAs
          </p>
          <p className="mt-0.5 text-xs text-red-800">
            The allocation algorithm hard-excludes this supplier until the account is reviewed and
            reinstated.
          </p>
        </div>
      )}

      {/* ---- Performance ---- */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total stock units" value={supplier.totalStockUnits} hint={tierRange(supplier)} />
        <StatCard
          label="Fulfilment rate"
          value={isPending ? '—' : `${(supplier.fulfilmentRate * 100).toFixed(0)}%`}
          tone={supplier.fulfilmentRate >= 0.9 ? 'positive' : supplier.fulfilmentRate >= 0.75 ? 'warning' : 'danger'}
          hint={`On-time confirmation and dispatch within SLA`}
        />
        <StatCard
          label="Missed SLAs"
          value={supplier.consecutiveMissedSlas}
          tone={supplier.consecutiveMissedSlas > 0 ? 'danger' : 'neutral'}
          hint="Consecutive"
        />
        <StatCard
          label="Allocation weight"
          value={`${tier.points} pts`}
          hint="40% of the allocation score"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* ---- Business details ---- */}
        <Card>
          <CardHeader title="Business details" description="Verified at application." />
          <dl className="divide-y divide-slate-100">
            <DetailRow label="Registered name" value={supplier.businessName} />
            <DetailRow label="Companies House" value={supplier.companiesHouseNumber} mono />
            <DetailRow label="VAT number" value={supplier.vatNumber} mono />
            <DetailRow
              label="Registered address"
              value={`${supplier.registeredAddress.line1}, ${supplier.registeredAddress.city}, ${supplier.registeredAddress.postcode}`}
            />
            <DetailRow label="Email" value={supplier.email} />
            <DetailRow label="Phone" value={supplier.phone} />
          </dl>
        </Card>

        {/* ---- Stripe Connect ---- */}
        <Card>
          <CardHeader
            title="Payouts & verification"
            description="Bank details are held by Stripe and never stored on the platform."
          />
          <dl className="divide-y divide-slate-100">
            <DetailRow
              label="KYC status"
              value={
                <StatusBadge
                  label={supplier.stripeConnect.kycStatus.replace('_', ' ').toLowerCase()}
                  tone={supplier.stripeConnect.kycStatus === 'VERIFIED' ? 'success' : 'warning'}
                  size="sm"
                />
              }
            />
            <DetailRow
              label="Payouts enabled"
              value={
                <StatusBadge
                  label={supplier.stripeConnect.payoutsEnabled ? 'Yes' : 'No'}
                  tone={supplier.stripeConnect.payoutsEnabled ? 'success' : 'neutral'}
                  size="sm"
                />
              }
            />
            <DetailRow
              label="Stripe account"
              value={supplier.stripeConnect.accountId ?? 'Not connected'}
              mono
            />
            <DetailRow label="Account status" value={supplier.status} />
          </dl>

          <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Payouts release automatically {SLA.returnWindowDays} days after delivery, net of
            commission.
          </p>
        </Card>
      </div>

      {supplier.note && (
        <Card className="mt-6 p-5">
          <h2 className="text-sm font-semibold text-slate-900">Admin note</h2>
          <p className="mt-1.5 text-sm text-slate-700">{supplier.note}</p>
        </Card>
      )}

      {/* ---------------- Confirmations ---------------- */}

      <ConfirmationModal
        open={action === 'approve'}
        onClose={() => setAction(null)}
        onConfirm={() => mutate.mutate('approve')}
        title="Approve this supplier?"
        description={`${supplier.businessName} will be emailed a welcome notification and will be able to submit stock and receive order allocations immediately.`}
        confirmLabel="Approve supplier"
        destructive={false}
        loading={mutate.isPending}
        error={mutate.isError ? errorMessage(mutate.error) : null}
        requireReason={false}
      />

      <ConfirmationModal
        open={action === 'reject'}
        onClose={() => setAction(null)}
        onConfirm={() => mutate.mutate('reject')}
        title="Reject this application?"
        description={`${supplier.businessName} will be emailed your reason. Be specific — they may reapply.`}
        confirmLabel="Reject application"
        loading={mutate.isPending}
        error={mutate.isError ? errorMessage(mutate.error) : null}
        requireReason
        reasonLabel="Reason for rejection (emailed to the applicant and logged)"
        onReasonChange={setNote}
      />

      <ConfirmationModal
        open={action === 'suspend'}
        onClose={() => setAction(null)}
        onConfirm={() => mutate.mutate('suspend')}
        title="Suspend this supplier?"
        description={`${supplier.businessName} will be excluded from all future order allocations and will not be able to submit new stock. Orders already in flight are unaffected.`}
        confirmLabel="Suspend supplier"
        confirmationPhrase="SUSPEND"
        loading={mutate.isPending}
        error={mutate.isError ? errorMessage(mutate.error) : null}
        requireReason
        reasonLabel="Reason for suspension (logged for audit)"
        onReasonChange={setNote}
      />

      <ConfirmationModal
        open={action === 'reactivate'}
        onClose={() => setAction(null)}
        onConfirm={() => mutate.mutate('reactivate')}
        title="Reactivate this supplier?"
        description={`${supplier.businessName} will be eligible for order allocation again and can resume submitting stock.`}
        confirmLabel="Reactivate supplier"
        destructive={false}
        loading={mutate.isPending}
        error={mutate.isError ? errorMessage(mutate.error) : null}
        requireReason
        reasonLabel="Reason for reactivation (logged for audit)"
        onReasonChange={setNote}
      />
    </>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-4 px-5 py-3">
      <dt className="w-40 shrink-0 text-sm text-slate-500">{label}</dt>
      <dd className={`min-w-0 text-sm text-slate-900 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}

function tierRange(supplier: Supplier): string {
  const def = SUPPLIER_TIER_MAP[supplier.tier];
  return def.max ? `${def.label}: ${def.min}–${def.max}` : `${def.label}: ${def.min}+`;
}
