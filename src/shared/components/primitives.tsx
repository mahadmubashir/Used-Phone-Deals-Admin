import * as React from 'react';
import { cn } from '../lib/cn';

/* ------------------------------------------------------------------ *
 * Button
 * ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600',
  secondary: 'bg-slate-900 text-white hover:bg-slate-800 focus-visible:outline-slate-900',
  outline:
    'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 focus-visible:outline-brand-600',
  ghost: 'text-slate-700 hover:bg-slate-100 focus-visible:outline-brand-600',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
});

/* ------------------------------------------------------------------ *
 * Spinner / loading & empty states
 * ------------------------------------------------------------------ */

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin text-current', className ?? 'h-5 w-5')}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function LoadingState({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-3 py-16 text-slate-500', className)}
    >
      <Spinner className="h-7 w-7 text-brand-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200', className)} aria-hidden="true" />;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-14 text-center',
        className,
      )}
    >
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center',
        className,
      )}
    >
      <h3 className="text-base font-semibold text-red-900">{title}</h3>
      {message && <p className="mt-1 max-w-md text-sm text-red-800">{message}</p>}
      {onRetry && (
        <Button variant="outline" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Form fields — label, hint and inline error wired up for screen readers
 * ------------------------------------------------------------------ */

export interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Field({ id, label, error, hint, required, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-900">
        {label}
        {required && (
          <span className="ml-0.5 text-red-600" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-slate-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL_CLASS =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 shadow-sm transition-colors ' +
  'focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ' +
  'aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-500/20';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, id, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${id}-error` : `${id}-hint`}
      className={cn(CONTROL_CLASS, className)}
      {...rest}
    />
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, id, rows = 4, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      id={id}
      rows={rows}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${id}-error` : `${id}-hint`}
      className={cn(CONTROL_CLASS, 'resize-y', className)}
      {...rest}
    />
  );
});

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  options?: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, id, options, placeholder, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      id={id}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? `${id}-error` : `${id}-hint`}
      className={cn(CONTROL_CLASS, 'pr-9', className)}
      {...rest}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options?.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
      {children}
    </select>
  );
});

export function Checkbox({
  id,
  label,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start gap-2.5 text-sm text-slate-700', className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-2 focus:ring-brand-600/30"
        {...rest}
      />
      <span>{label}</span>
    </label>
  );
}

/* ------------------------------------------------------------------ *
 * Card
 * ------------------------------------------------------------------ */

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>{children}</div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4', className)}>
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Star rating
 * ------------------------------------------------------------------ */

export function StarRating({
  rating,
  count,
  size = 'md',
  className,
}: {
  rating: number;
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const dimension = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div
        className="flex items-center"
        role="img"
        aria-label={`Rated ${rating.toFixed(1)} out of 5${count !== undefined ? ` from ${count} reviews` : ''}`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={cn(dimension, star <= Math.round(rating) ? 'text-amber-400' : 'text-slate-300')}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.363 1.118l1.285 3.957c.3.922-.755 1.688-1.539 1.118l-3.366-2.446a1 1 0 00-1.176 0l-3.366 2.446c-.784.57-1.838-.196-1.539-1.118l1.285-3.957a1 1 0 00-.363-1.118L2.06 9.385c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.951-.69l1.286-3.958z" />
          </svg>
        ))}
      </div>
      {count !== undefined && (
        <span className="text-xs text-slate-600">
          {rating > 0 ? rating.toFixed(1) : 'No rating'}
          {count > 0 && ` (${count})`}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Pagination
 * ------------------------------------------------------------------ */

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  return (
    <nav className={cn('flex items-center justify-center gap-1', className)} aria-label="Pagination">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        Previous
      </Button>
      {pages.map((entry, index) =>
        entry === '…' ? (
          <span key={`gap-${index}`} className="px-2 text-sm text-slate-400" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => onPageChange(entry)}
            aria-current={entry === page ? 'page' : undefined}
            className={cn(
              'h-9 min-w-9 rounded-lg px-2.5 text-sm font-medium transition-colors',
              entry === page
                ? 'bg-brand-600 text-white'
                : 'text-slate-700 hover:bg-slate-100',
            )}
          >
            {entry}
          </button>
        ),
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        Next
      </Button>
    </nav>
  );
}

function pageWindow(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const out: (number | '…')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) out.push('…');
  for (let i = start; i <= end; i += 1) out.push(i);
  if (end < totalPages - 1) out.push('…');
  out.push(totalPages);
  return out;
}
