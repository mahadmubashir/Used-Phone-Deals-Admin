import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  SLA,
  StatusBadge,
  SUPPLIER_NOTIFICATION_LABELS,
  Textarea,
  cn,
  errorMessage,
  formatCountdown,
  formatDateTime,
  type SupplierCsrNotification,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';

/**
 * Support requests from the CSR team.
 *
 * Note what this screen is not: it is not a conversation with the buyer. The
 * supplier never sees the buyer's own words or contact details — the CSR team
 * decides the resolution, instructs the supplier here, and relays the outcome
 * back to the buyer themselves.
 */
export function CsrNotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = React.useState<'ALL' | 'ACTION_REQUIRED'>('ALL');

  const query = useQuery({
    queryKey: queryKeys.supplier.csrNotifications,
    queryFn: () => api.get<SupplierCsrNotification[]>(endpoints.supplier.csrNotifications),
  });

  const respond = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) =>
      api.post(endpoints.supplier.respondToCsr(id), { response }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.supplier.csrNotifications }),
  });

  if (query.isLoading) return <LoadingState label="Loading support requests…" />;
  if (query.isError) {
    return <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />;
  }

  const all = query.data ?? [];
  const items = filter === 'ALL' ? all : all.filter((n) => n.status === 'ACTION_REQUIRED');
  const actionCount = all.filter((n) => n.status === 'ACTION_REQUIRED').length;

  return (
    <>
      <PageHeader
        title="Support requests"
        description={`Actions requested by the customer service team. Respond within ${SLA.supplierCsrResponseDays} business days.`}
      />

      <div className="mb-5 flex gap-1.5">
        {(
          [
            ['ALL', `All (${all.length})`],
            ['ACTION_REQUIRED', `Action required (${actionCount})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            aria-pressed={filter === value}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
              filter === value
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Nothing to action"
          description="When our customer service team needs something from you about an order, it will appear here."
        />
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <NotificationCard
                notification={item}
                onRespond={(response) => respond.mutate({ id: item.id, response })}
                submitting={respond.isPending}
                error={respond.isError ? errorMessage(respond.error) : null}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function NotificationCard({
  notification,
  onRespond,
  submitting,
  error,
}: {
  notification: SupplierCsrNotification;
  onRespond: (response: string) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [response, setResponse] = React.useState('');
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const responseId = React.useId();

  const needsAction = notification.status === 'ACTION_REQUIRED';
  const sla = formatCountdown(notification.dueAt);

  return (
    <Card className={cn(needsAction && 'border-l-4 border-l-red-500')}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">
            {SUPPLIER_NOTIFICATION_LABELS[notification.type]}
          </h2>
          <p className="mt-0.5 font-mono text-xs text-slate-500">
            Case {notification.caseReference} · Order {notification.orderReference}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {needsAction && (
            <StatusBadge
              label={sla.text}
              tone={sla.overdue ? 'danger' : sla.urgent ? 'warning' : 'neutral'}
              size="sm"
            />
          )}
          <StatusBadge
            label={
              notification.status === 'ACTION_REQUIRED'
                ? 'Action required'
                : notification.status === 'RESPONDED'
                  ? 'Responded'
                  : 'Resolved'
            }
            tone={
              notification.status === 'ACTION_REQUIRED'
                ? 'danger'
                : notification.status === 'RESPONDED'
                  ? 'progress'
                  : 'success'
            }
            size="sm"
          />
        </div>
      </div>

      <div className="p-5">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-900">From the customer service team</p>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{notification.message}</p>
          <p className="mt-2 text-xs text-slate-500">{formatDateTime(notification.createdAt)}</p>
        </div>

        {notification.response && (
          <div className="mt-4 rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-900">Your response</p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{notification.response}</p>
            {notification.respondedAt && (
              <p className="mt-2 text-xs text-slate-500">
                Sent {formatDateTime(notification.respondedAt)}
              </p>
            )}
          </div>
        )}

        {needsAction && (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (response.trim().length < 5) {
                setValidationError('Please write a short response.');
                return;
              }
              setValidationError(null);
              onRespond(response.trim());
            }}
          >
            <div className="space-y-1.5">
              <label htmlFor={responseId} className="block text-sm font-medium text-slate-900">
                Your response
                <span className="ml-0.5 text-red-600">*</span>
              </label>
              <Textarea
                id={responseId}
                rows={3}
                value={response}
                onChange={(event) => setResponse(event.target.value)}
                invalid={Boolean(validationError)}
                placeholder="Confirm what you've done or what you need…"
              />
              {validationError && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {validationError}
                </p>
              )}
              <p className="text-xs text-slate-500">
                This goes to the customer service team, who will relay it to the buyer. You are never
                in direct contact with the buyer.
              </p>
            </div>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            )}

            <Button type="submit" loading={submitting}>
              Send response
            </Button>
          </form>
        )}

        {needsAction && sla.overdue && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-xs text-red-800">
            This is past its {SLA.supplierCsrResponseDays}-business-day SLA. An automatic refund may
            already have been issued to the buyer and the case flagged to the Super Admin.
          </p>
        )}
      </div>
    </Card>
  );
}
