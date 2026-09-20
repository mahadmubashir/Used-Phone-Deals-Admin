import * as React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardHeader,
  ErrorState,
  Field,
  Input,
  LoadingState,
  StatusBadge,
  TierBadge,
  errorMessage,
  formatDate,
  hasErrors,
  validateEmail,
  validatePassword,
  validateUkPhone,
  type FieldErrors,
  type Supplier,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';

export function SupplierSettingsPage() {
  const query = useQuery({
    queryKey: queryKeys.supplier.profile,
    queryFn: () => api.get<Supplier>(endpoints.supplier.profile),
  });

  if (query.isLoading) return <LoadingState label="Loading your profile…" />;
  if (query.isError) {
    return <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />;
  }

  const supplier = query.data!;

  return (
    <>
      <PageHeader
        title="Account settings"
        description="Your business details, payout account and security settings."
        tier={supplier.tier}
      />

      <div className="space-y-6">
        <BusinessProfile supplier={supplier} />
        <ContactDetails supplier={supplier} />
        <BankDetails supplier={supplier} />
        <SecuritySettings />
      </div>
    </>
  );
}

/* ---- Business profile: locked after approval ---- */

function BusinessProfile({ supplier }: { supplier: Supplier }) {
  const locked = supplier.status === 'ACTIVE' || supplier.status === 'SUSPENDED';

  return (
    <Card>
      <CardHeader
        title="Business profile"
        description={
          locked
            ? 'These details were verified at approval and can only be changed by the admin team.'
            : 'These details are verified before your account is approved.'
        }
        action={<TierBadge tier={supplier.tier} />}
      />

      <dl className="grid gap-5 p-5 sm:grid-cols-2">
        <ReadOnlyField label="Registered business name" value={supplier.businessName} locked={locked} />
        <ReadOnlyField label="Companies House number" value={supplier.companiesHouseNumber} locked={locked} />
        <ReadOnlyField label="VAT number" value={supplier.vatNumber} locked={locked} />
        <ReadOnlyField
          label="Account status"
          value={
            <StatusBadge
              label={supplier.status === 'ACTIVE' ? 'Active' : supplier.status}
              tone={
                supplier.status === 'ACTIVE'
                  ? 'success'
                  : supplier.status === 'SUSPENDED'
                    ? 'danger'
                    : 'warning'
              }
              size="sm"
            />
          }
          locked={locked}
        />
        <div className="sm:col-span-2">
          <dt className="text-sm font-medium text-slate-900">Registered address</dt>
          <dd className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2.5 text-sm not-italic text-slate-700">
            {supplier.registeredAddress.line1}, {supplier.registeredAddress.city},{' '}
            {supplier.registeredAddress.postcode}
          </dd>
        </div>
      </dl>

      <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
        Approved {supplier.approvedAt ? formatDate(supplier.approvedAt) : '—'} · Fulfilment rate{' '}
        {(supplier.fulfilmentRate * 100).toFixed(0)}%
      </p>
    </Card>
  );
}

function ReadOnlyField({
  label,
  value,
  locked,
}: {
  label: string;
  value: React.ReactNode;
  locked: boolean;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
        {label}
        {locked && (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-slate-400" aria-label="Locked">
            <path
              fillRule="evenodd"
              d="M10 1a4 4 0 00-4 4v2H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-1V5a4 4 0 00-4-4zm2 6V5a2 2 0 10-4 0v2h4z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </dt>
      <dd className="mt-1.5 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">{value}</dd>
    </div>
  );
}

/* ---- Contact details: editable ---- */

function ContactDetails({ supplier }: { supplier: Supplier }) {
  const [form, setForm] = React.useState({ email: supplier.email, phone: supplier.phone });
  const [errors, setErrors] = React.useState<FieldErrors<keyof typeof form>>({});

  const save = useMutation({
    mutationFn: () => api.patch(endpoints.supplier.profile, form),
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next = { email: validateEmail(form.email), phone: validateUkPhone(form.phone) };
    setErrors(next);
    if (hasErrors(next)) return;
    save.mutate();
  }

  return (
    <Card>
      <CardHeader title="Contact details" description="Where we send order and support notifications." />
      <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="email" label="Email address" required error={errors.email}>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              invalid={Boolean(errors.email)}
            />
          </Field>
          <Field id="phone" label="Phone number" required error={errors.phone}>
            <Input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              invalid={Boolean(errors.phone)}
            />
          </Field>
        </div>
        <SaveRow mutation={save} label="Contact details saved" />
      </form>
    </Card>
  );
}

/* ---- Bank details: Stripe Connect managed ---- */

function BankDetails({ supplier }: { supplier: Supplier }) {
  const link = useMutation({
    mutationFn: () => api.post<{ url: string }>(endpoints.supplier.stripeConnectLink),
    onSuccess: (result) => {
      window.location.href = result.url;
    },
  });

  const verified = supplier.stripeConnect.kycStatus === 'VERIFIED';

  return (
    <Card>
      <CardHeader title="Bank account & payouts" description="Managed securely by Stripe Connect." />
      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3.5">
          <div>
            <p className="text-sm font-medium text-slate-900">Identity &amp; bank verification</p>
            <p className="mt-0.5 text-xs text-slate-600">
              {verified
                ? 'Verified — payouts are enabled on your account.'
                : 'Verification is required before payouts can be released to you.'}
            </p>
          </div>
          <StatusBadge
            label={verified ? 'Verified' : supplier.stripeConnect.kycStatus.replace('_', ' ')}
            tone={verified ? 'success' : 'warning'}
            size="sm"
          />
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-600">
          Your bank details are held by Stripe and are never stored on the UsedPhoneDeals platform.
          Use the button below to view or update them on Stripe&apos;s secure portal.
        </p>

        {link.isError && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
            {errorMessage(link.error)}
          </p>
        )}

        <Button variant="outline" className="mt-4" loading={link.isPending} onClick={() => link.mutate()}>
          {verified ? 'Manage payout details on Stripe' : 'Complete verification on Stripe'}
        </Button>
      </div>
    </Card>
  );
}

/* ---- Security ---- */

function SecuritySettings() {
  const [form, setForm] = React.useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = React.useState<FieldErrors<keyof typeof form>>({});

  const save = useMutation({
    mutationFn: () =>
      api.post(endpoints.auth.changePassword, {
        currentPassword: form.current,
        newPassword: form.next,
      }),
    onSuccess: () => setForm({ current: '', next: '', confirm: '' }),
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next = {
      current: form.current ? undefined : 'Enter your current password',
      next: validatePassword(form.next),
      confirm: form.next === form.confirm ? undefined : 'Passwords do not match',
    };
    setErrors(next);
    if (hasErrors(next)) return;
    save.mutate();
  }

  return (
    <Card>
      <CardHeader title="Security" description="Password and two-factor authentication." />

      <div className="border-b border-slate-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3.5">
          <div>
            <p className="text-sm font-medium text-slate-900">Two-factor authentication</p>
            <p className="mt-0.5 text-xs text-slate-600">
              Mandatory on all supplier accounts and cannot be switched off.
            </p>
          </div>
          <StatusBadge label="Enabled" tone="success" size="sm" />
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
        <Field id="current" label="Current password" required error={errors.current}>
          <Input
            id="current"
            type="password"
            autoComplete="current-password"
            value={form.current}
            onChange={(event) => setForm({ ...form, current: event.target.value })}
            invalid={Boolean(errors.current)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="next"
            label="New password"
            required
            error={errors.next}
            hint="At least 10 characters, mixed case and a number."
          >
            <Input
              id="next"
              type="password"
              autoComplete="new-password"
              value={form.next}
              onChange={(event) => setForm({ ...form, next: event.target.value })}
              invalid={Boolean(errors.next)}
            />
          </Field>
          <Field id="confirm" label="Confirm new password" required error={errors.confirm}>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(event) => setForm({ ...form, confirm: event.target.value })}
              invalid={Boolean(errors.confirm)}
            />
          </Field>
        </div>
        <SaveRow mutation={save} label="Password updated" />
      </form>
    </Card>
  );
}

function SaveRow({
  mutation,
  label,
}: {
  mutation: { isPending: boolean; isError: boolean; isSuccess: boolean; error: unknown };
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
      <Button type="submit" loading={mutation.isPending}>
        Save changes
      </Button>
      {mutation.isSuccess && (
        <p role="status" className="text-sm font-medium text-emerald-700">
          {label}
        </p>
      )}
      {mutation.isError && (
        <p role="alert" className="text-sm text-red-700">
          {errorMessage(mutation.error)}
        </p>
      )}
    </div>
  );
}
