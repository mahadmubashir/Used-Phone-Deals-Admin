import * as React from 'react';
import { cn } from '../lib/cn';
import { Button } from './primitives';

/**
 * Accessible modal: focus is trapped, Escape closes, the underlying page is
 * inert while open, and focus returns to the trigger on close.
 */
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Blocks backdrop/Escape dismissal while an action is in flight. */
  busy?: boolean;
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md', busy }: ModalProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement as HTMLElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const focusables = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    focusables()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose, busy]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={() => !busy && onClose()}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          'relative w-full rounded-t-2xl bg-white shadow-xl sm:rounded-2xl',
          size === 'sm' && 'sm:max-w-sm',
          size === 'md' && 'sm:max-w-lg',
          size === 'lg' && 'sm:max-w-2xl',
        )}
      >
        <div className="px-5 pb-4 pt-5 sm:px-6">
          <h2 id={titleId} className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          {description && (
            <div id={descriptionId} className="mt-1.5 text-sm text-slate-600">
              {description}
            </div>
          )}
        </div>
        {children && <div className="max-h-[60vh] overflow-y-auto px-5 pb-2 sm:px-6">{children}</div>}
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions get the red treatment. */
  destructive?: boolean;
  /** When set, the confirm button stays disabled until the user types this. */
  confirmationPhrase?: string;
  /** A mandatory reason note — required for every admin override. */
  requireReason?: boolean;
  reasonLabel?: string;
  children?: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  onReasonChange?: (reason: string) => void;
}

/**
 * Used for every destructive or financially significant action: refunds,
 * cancellations, suspensions, order reassignment, listing deletion.
 */
export function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = true,
  confirmationPhrase,
  requireReason,
  reasonLabel = 'Reason (recorded in the audit log)',
  children,
  loading,
  error,
  onReasonChange,
}: ConfirmationModalProps) {
  const [phrase, setPhrase] = React.useState('');
  const [reason, setReason] = React.useState('');
  const reasonId = React.useId();
  const phraseId = React.useId();

  React.useEffect(() => {
    if (!open) {
      setPhrase('');
      setReason('');
    }
  }, [open]);

  const phraseOk = !confirmationPhrase || phrase.trim() === confirmationPhrase;
  const reasonOk = !requireReason || reason.trim().length >= 5;
  const canConfirm = phraseOk && reasonOk && !loading;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      busy={loading}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={() => void onConfirm()}
            disabled={!canConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pb-2">
        {children}

        {requireReason && (
          <div className="space-y-1.5">
            <label htmlFor={reasonId} className="block text-sm font-medium text-slate-900">
              {reasonLabel}
              <span className="ml-0.5 text-red-600">*</span>
            </label>
            <textarea
              id={reasonId}
              rows={3}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                onReasonChange?.(event.target.value);
              }}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
              placeholder="Explain why this override is necessary…"
            />
            {!reasonOk && reason.length > 0 && (
              <p className="text-xs text-red-600">Please give at least a short explanation.</p>
            )}
          </div>
        )}

        {confirmationPhrase && (
          <div className="space-y-1.5">
            <label htmlFor={phraseId} className="block text-sm font-medium text-slate-900">
              Type <span className="font-mono font-semibold">{confirmationPhrase}</span> to confirm
            </label>
            <input
              id={phraseId}
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              autoComplete="off"
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20"
            />
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
