import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  CASE_STATUS_LABELS,
  Card,
  CardHeader,
  ConfirmationModal,
  Field,
  Input,
  Select,
  Textarea,
  cn,
  errorMessage,
  formatPrice,
  parsePriceToPence,
  type CSRCase,
  type CaseStatus,
  type Order,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';

type ModalKind =
  | 'approve-return'
  | 'reject-return'
  | 'full-refund'
  | 'partial-refund'
  | 'escalate'
  | null;

/**
 * Everything a CSR agent can do to a case.
 *
 * Standard full and partial refunds are issued here without Super Admin
 * approval, per the agreed workflow — but every one is a confirmed action and
 * every one is written to the audit log.
 */
export function ActionPanel({ csrCase, isAdmin }: { csrCase: CSRCase; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [modal, setModal] = React.useState<ModalKind>(null);

  const refresh = (updated: CSRCase) => {
    queryClient.setQueryData(queryKeys.csr.case(csrCase.id), updated);
    queryClient.invalidateQueries({ queryKey: ['csr', 'cases'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.csr.summary });
    setModal(null);
  };

  // Each action is its own mutation so the pending/error state stays local to
  // the control that triggered it.
  const updateStatus = useMutation({
    mutationFn: (status: CaseStatus) =>
      api.post<CSRCase>(endpoints.csr.updateStatus(csrCase.id), { status }),
    onSuccess: refresh,
  });

  const replyToBuyer = useMutation({
    mutationFn: (message: string) =>
      api.post<CSRCase>(endpoints.csr.replyToBuyer(csrCase.id), { message }),
    onSuccess: refresh,
  });

  const notifySupplier = useMutation({
    mutationFn: (message: string) =>
      api.post<CSRCase>(endpoints.csr.notifySupplier(csrCase.id), { message }),
    onSuccess: refresh,
  });

  const approveReturn = useMutation({
    mutationFn: () => api.post<CSRCase>(endpoints.csr.approveReturn(csrCase.id)),
    onSuccess: refresh,
  });

  const rejectReturn = useMutation({
    mutationFn: (reason: string) =>
      api.post<CSRCase>(endpoints.csr.rejectReturn(csrCase.id), { reason }),
    onSuccess: refresh,
  });

  const refund = useMutation({
    mutationFn: (payload: { amountPence: number; partial: boolean }) =>
      api.post<CSRCase>(endpoints.csr.refund(csrCase.id), payload),
    onSuccess: refresh,
  });

  const escalate = useMutation({
    mutationFn: (note: string) =>
      api.post<CSRCase>(endpoints.csr.escalate(csrCase.id), { note }),
    onSuccess: refresh,
  });

  const order = useQuery({
    queryKey: queryKeys.csr.orders({ id: csrCase.orderId }),
    queryFn: () => api.get<Order>(endpoints.csr.order(csrCase.orderId)),
  });

  const orderTotal = order.data?.totalPence ?? 0;
  const settled = csrCase.status === 'RESOLVED' || csrCase.status === 'CLOSED';
  const isReturnCase = csrCase.type === 'RETURN_REQUEST' || csrCase.type === 'REFUND_REQUEST';

  const [rejectReason, setRejectReason] = React.useState('');
  const [escalateNote, setEscalateNote] = React.useState('');
  const [partialAmount, setPartialAmount] = React.useState('');

  const partialPence = parsePriceToPence(partialAmount);
  const partialValid =
    partialPence !== null && partialPence > 0 && partialPence <= orderTotal;

  return (
    <div className="space-y-4">
      {/* ---- Status ---- */}
      <Card>
        <CardHeader title="Case status" />
        <div className="p-5">
          <Field id="case-status" label="Update status">
            <Select
              id="case-status"
              value={csrCase.status}
              onChange={(event) => updateStatus.mutate(event.target.value as CaseStatus)}
              disabled={updateStatus.isPending}
              options={(Object.keys(CASE_STATUS_LABELS) as CaseStatus[]).map((status) => ({
                value: status,
                label: CASE_STATUS_LABELS[status],
              }))}
            />
          </Field>
          {updateStatus.isError && (
            <p role="alert" className="mt-2 text-xs text-red-700">
              {errorMessage(updateStatus.error)}
            </p>
          )}
        </div>
      </Card>

      {/* ---- Reply to buyer ---- */}
      <MessageCard
        title="Reply to the buyer"
        description="Sends an email and an in-app notification to the buyer."
        placeholder="Write your reply to the buyer…"
        buttonLabel="Send reply"
        mutation={replyToBuyer}
        disabled={settled}
      />

      {/* ---- Notify supplier ---- */}
      <MessageCard
        title="Notify the supplier"
        description="Appears on the supplier's dashboard. They have 2 business days to respond. The buyer never sees this."
        placeholder="Tell the supplier what action is required…"
        buttonLabel="Notify supplier"
        mutation={notifySupplier}
        disabled={settled}
        tone="amber"
      />

      {/* ---- Returns ---- */}
      {isReturnCase && (
        <Card>
          <CardHeader
            title="Return decision"
            description="Approving generates a free Shippo return label and emails it to the buyer."
          />
          <div className="space-y-2 p-5">
            <Button
              fullWidth
              onClick={() => setModal('approve-return')}
              disabled={settled || approveReturn.isPending}
            >
              Approve return
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => setModal('reject-return')}
              disabled={settled}
            >
              Reject return
            </Button>
          </div>
        </Card>
      )}

      {/* ---- Refunds ---- */}
      <Card>
        <CardHeader
          title="Refunds"
          description={
            order.data
              ? `Order total ${formatPrice(orderTotal)} · issued via Stripe`
              : 'Issued via Stripe'
          }
        />
        <div className="space-y-2 p-5">
          <Button
            variant="danger"
            fullWidth
            onClick={() => setModal('full-refund')}
            disabled={settled || !order.data}
          >
            Issue full refund
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => setModal('partial-refund')}
            disabled={settled || !order.data}
          >
            Issue partial refund
          </Button>
          <p className="pt-1 text-xs text-slate-500">
            Standard refunds do not need Super Admin approval. Every refund is logged against your
            name.
          </p>
        </div>
      </Card>

      {/* ---- Escalate ---- */}
      {!isAdmin && (
        <Card>
          <CardHeader title="Escalate" description="Hand this case to the Super Admin." />
          <div className="p-5">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setModal('escalate')}
              disabled={csrCase.escalatedToAdmin}
            >
              {csrCase.escalatedToAdmin ? 'Already escalated' : 'Escalate to Super Admin'}
            </Button>
          </div>
        </Card>
      )}

      {isAdmin && (
        <Card className="border-brand-200 bg-brand-50/40">
          <CardHeader
            title="Super Admin"
            description="You can override any decision on this case, including ones already taken by an agent."
          />
        </Card>
      )}

      {/* ---------------- Modals ---------------- */}

      <ConfirmationModal
        open={modal === 'approve-return'}
        onClose={() => setModal(null)}
        onConfirm={() => approveReturn.mutate()}
        title="Approve this return?"
        description="A free, pre-paid Shippo return label will be generated and emailed to the buyer immediately. The case moves to Awaiting Supplier Action once the item is in transit."
        confirmLabel="Approve and send label"
        destructive={false}
        loading={approveReturn.isPending}
        error={approveReturn.isError ? errorMessage(approveReturn.error) : null}
      />

      <ConfirmationModal
        open={modal === 'reject-return'}
        onClose={() => setModal(null)}
        onConfirm={() => rejectReturn.mutate(rejectReason)}
        title="Reject this return?"
        description="The buyer will be emailed your reason. Be specific — this is what they will read."
        confirmLabel="Reject return"
        loading={rejectReturn.isPending}
        error={rejectReturn.isError ? errorMessage(rejectReturn.error) : null}
        requireReason
        reasonLabel="Reason for rejection (sent to the buyer and logged)"
        onReasonChange={setRejectReason}
      />

      <ConfirmationModal
        open={modal === 'full-refund'}
        onClose={() => setModal(null)}
        onConfirm={() => refund.mutate({ amountPence: orderTotal, partial: false })}
        title="Issue a full refund?"
        description={`${formatPrice(orderTotal)} will be refunded to the buyer's original payment method via Stripe. This cannot be reversed.`}
        confirmLabel={`Refund ${formatPrice(orderTotal)}`}
        confirmationPhrase="REFUND"
        loading={refund.isPending}
        error={refund.isError ? errorMessage(refund.error) : null}
      />

      <ConfirmationModal
        open={modal === 'partial-refund'}
        onClose={() => setModal(null)}
        onConfirm={() => {
          if (partialValid) refund.mutate({ amountPence: partialPence!, partial: true });
        }}
        title="Issue a partial refund"
        description="Refund part of the order value while the buyer keeps the item."
        confirmLabel={partialValid ? `Refund ${formatPrice(partialPence!)}` : 'Enter an amount'}
        loading={refund.isPending}
        error={refund.isError ? errorMessage(refund.error) : null}
      >
        <Field
          id="partial-amount"
          label="Refund amount"
          required
          hint={`Must be between £0.01 and ${formatPrice(orderTotal)}.`}
          error={
            partialAmount && !partialValid
              ? `Enter an amount up to ${formatPrice(orderTotal)}`
              : undefined
          }
        >
          <Input
            id="partial-amount"
            inputMode="decimal"
            value={partialAmount}
            onChange={(event) => setPartialAmount(event.target.value)}
            placeholder="0.00"
            invalid={Boolean(partialAmount) && !partialValid}
          />
        </Field>
      </ConfirmationModal>

      <ConfirmationModal
        open={modal === 'escalate'}
        onClose={() => setModal(null)}
        onConfirm={() => escalate.mutate(escalateNote)}
        title="Escalate to Super Admin?"
        description="The case stays with you, but it is flagged in the Super Admin action queue for review."
        confirmLabel="Escalate case"
        destructive={false}
        loading={escalate.isPending}
        error={escalate.isError ? errorMessage(escalate.error) : null}
        requireReason
        reasonLabel="Why does this need Super Admin attention?"
        onReasonChange={setEscalateNote}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Reusable message composer
 * ------------------------------------------------------------------ */

function MessageCard({
  title,
  description,
  placeholder,
  buttonLabel,
  mutation,
  disabled,
  tone,
}: {
  title: string;
  description: string;
  placeholder: string;
  buttonLabel: string;
  mutation: {
    mutate: (message: string) => void;
    isPending: boolean;
    isError: boolean;
    isSuccess: boolean;
    error: unknown;
  };
  disabled?: boolean;
  tone?: 'amber';
}) {
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const id = React.useId();

  return (
    <Card className={cn(tone === 'amber' && 'border-amber-200')}>
      <CardHeader title={title} description={description} />
      <form
        className="space-y-3 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (message.trim().length < 5) {
            setError('Please write a message first.');
            return;
          }
          setError(null);
          const outgoing = message.trim();
          // Clear optimistically — the composer should empty the moment the
          // message is handed off, not one render after it lands.
          setMessage('');
          mutation.mutate(outgoing);
        }}
      >
        <label htmlFor={id} className="sr-only">
          {title}
        </label>
        <Textarea
          id={id}
          rows={4}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          invalid={Boolean(error)}
        />
        {error && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {error}
          </p>
        )}
        {mutation.isError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
            {errorMessage(mutation.error)}
          </p>
        )}
        <Button type="submit" fullWidth loading={mutation.isPending} disabled={disabled}>
          {buttonLabel}
        </Button>
      </form>
    </Card>
  );
}
