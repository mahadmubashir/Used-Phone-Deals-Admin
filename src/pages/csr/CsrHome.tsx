import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CSRCaseCard,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  SLA,
  errorMessage,
  type CSRCase,
  type Paginated,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';
import { StatCard } from '@/components/StatCard';

interface CsrSummary {
  openCases: number;
  inProgress: number;
  awaitingSupplier: number;
  resolvedToday: number;
  avgResponseHours: number;
}

export function CsrHome() {
  const navigate = useNavigate();

  const summary = useQuery({
    queryKey: queryKeys.csr.summary,
    queryFn: () => api.get<CsrSummary>(endpoints.csr.summary),
  });

  // Priority queue: oldest open cases first — the ones closest to breaching.
  const queue = useQuery({
    queryKey: queryKeys.csr.cases({ priority: true }),
    queryFn: () =>
      api.get<Paginated<CSRCase>>(endpoints.csr.cases, {
        query: { status: 'OPEN', sort: 'raisedAt', pageSize: 6 },
      }),
    refetchInterval: 60_000,
  });

  if (summary.isLoading) return <LoadingState label="Loading your dashboard…" />;
  if (summary.isError) {
    return <ErrorState message={errorMessage(summary.error)} onRetry={() => void summary.refetch()} />;
  }

  const data = summary.data!;
  const cases = queue.data?.data ?? [];

  return (
    <>
      <PageHeader
        title="Customer service"
        description={`Every buyer query, return and refund lands here. First response within ${SLA.csrFirstResponseDays} business day, resolution within ${SLA.csrResolutionDays}.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Open cases"
          value={data.openCases}
          tone={data.openCases > 0 ? 'danger' : 'neutral'}
          hint="Not yet picked up"
        />
        <StatCard label="In progress" value={data.inProgress} />
        <StatCard
          label="Awaiting supplier"
          value={data.awaitingSupplier}
          tone={data.awaitingSupplier > 0 ? 'warning' : 'neutral'}
          hint={`${SLA.supplierCsrResponseDays}-day supplier SLA`}
        />
        <StatCard label="Resolved today" value={data.resolvedToday} tone="positive" />
        <StatCard
          label="Avg first response"
          value={`${data.avgResponseHours.toFixed(1)}h`}
          hint={`Target: ${SLA.csrFirstResponseDays * 24}h`}
        />
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Priority queue"
          description="Oldest unassigned cases first — work from the top."
          action={
            <button
              type="button"
              onClick={() => navigate('/csr/cases')}
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              View all cases
            </button>
          }
        />

        <div className="p-5">
          {queue.isLoading ? (
            <LoadingState />
          ) : cases.length === 0 ? (
            <EmptyState
              title="The queue is clear"
              description="No open cases are waiting to be picked up. Nice work."
            />
          ) : (
            <ul className="space-y-3">
              {cases.map((item) => (
                <li key={item.id}>
                  <CSRCaseCard
                    csrCase={item}
                    onOpen={(selected) => navigate(`/csr/cases/${selected.id}`)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold text-slate-900">How cases work here</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-slate-600">
          <li>Every buyer message, return and refund request routes into this queue automatically.</li>
          <li>
            You reply to the buyer directly. The supplier is not told anything at this point and is
            never in contact with the buyer.
          </li>
          <li>
            If a return is approved, a Shippo return label is generated and emailed to the buyer
            automatically.
          </li>
          <li>
            Once the item is in transit you notify the supplier, who has{' '}
            {SLA.supplierCsrResponseDays} business days to act. You relay their response to the buyer.
          </li>
          <li>
            If the supplier misses that SLA, the buyer is auto-refunded and the Super Admin is
            alerted.
          </li>
        </ol>
      </Card>
    </>
  );
}
