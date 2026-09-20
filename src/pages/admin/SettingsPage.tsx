import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ALLOCATION_WEIGHTS,
  APPROVED_CARRIERS,
  Button,
  CATEGORIES,
  Card,
  CardHeader,
  Checkbox,
  Field,
  Input,
  LoadingState,
  SUPPLIER_TIERS,
  Select,
  StatusBadge,
  cn,
  errorMessage,
  formatDate,
  type CarrierCode,
  type CategorySlug,
  type CommissionRule,
  type SupplierTier,
  type VatScheme,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';

type Tab = 'commission' | 'carriers' | 'templates' | 'vat' | 'allocation';

const TABS: { key: Tab; label: string }[] = [
  { key: 'commission', label: 'Commission rates' },
  { key: 'carriers', label: 'Approved carriers' },
  { key: 'templates', label: 'Notification templates' },
  { key: 'vat', label: 'VAT defaults' },
  { key: 'allocation', label: 'Order allocation' },
];

export function SettingsPage() {
  const [tab, setTab] = React.useState<Tab>('commission');

  return (
    <>
      <PageHeader
        title="Platform settings"
        description="Commission, carriers, notification templates and VAT defaults. Super Admin only."
      />

      <div className="mb-5 flex flex-wrap gap-1.5" role="tablist" aria-label="Settings sections">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            role="tab"
            aria-selected={tab === entry.key}
            onClick={() => setTab(entry.key)}
            className={cn(
              'rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
              tab === entry.key
                ? 'bg-brand-600 text-white'
                : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === 'commission' && <CommissionSettings />}
      {tab === 'carriers' && <CarrierSettings />}
      {tab === 'templates' && <TemplateSettings />}
      {tab === 'vat' && <VatSettings />}
      {tab === 'allocation' && <AllocationSettings />}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Commission — a rate per category per tier
 * ------------------------------------------------------------------ */

function CommissionSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.admin.settings('commission'),
    queryFn: () => api.get<CommissionRule[]>(endpoints.admin.settings.commission),
  });

  const [draft, setDraft] = React.useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: () =>
      api.put(endpoints.admin.settings.commission, {
        rules: (query.data ?? []).map((rule) => ({
          ...rule,
          ratePercent: Number(draft[rule.id] ?? rule.ratePercent),
        })),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings('commission') }),
  });

  if (query.isLoading) return <LoadingState />;

  const rules = query.data ?? [];
  const rateFor = (category: CategorySlug, tier: SupplierTier) =>
    rules.find((rule) => rule.category === category && rule.tier === tier);

  const outOfRange = Object.values(draft).some((value) => {
    const num = Number(value);
    return Number.isNaN(num) || num < 5 || num > 15;
  });

  return (
    <Card>
      <CardHeader
        title="Commission rates"
        description="Deducted from each sale before the supplier payout is released. Permitted range is 5%–15%."
      />

      <div className="overflow-x-auto p-5">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Commission rate by category and supplier tier</caption>
          <thead>
            <tr className="border-b border-slate-200">
              <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                Category
              </th>
              {SUPPLIER_TIERS.map((tier) => (
                <th
                  key={tier.value}
                  scope="col"
                  className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-600"
                >
                  {tier.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {CATEGORIES.map((category) => (
              <tr key={category.slug}>
                <th scope="row" className="px-3 py-3 text-left font-medium text-slate-900">
                  {category.label}
                </th>
                {SUPPLIER_TIERS.map((tier) => {
                  const rule = rateFor(category.slug, tier.value);
                  if (!rule) return <td key={tier.value} className="px-3 py-3 text-center">—</td>;
                  const value = draft[rule.id] ?? String(rule.ratePercent);
                  const invalid = Number(value) < 5 || Number(value) > 15 || Number.isNaN(Number(value));
                  return (
                    <td key={tier.value} className="px-3 py-3">
                      <div className="relative mx-auto w-24">
                        <label htmlFor={`rate-${rule.id}`} className="sr-only">
                          {category.label} {tier.label} commission rate
                        </label>
                        <Input
                          id={`rate-${rule.id}`}
                          inputMode="decimal"
                          value={value}
                          onChange={(event) =>
                            setDraft({ ...draft, [rule.id]: event.target.value })
                          }
                          invalid={invalid}
                          className="h-9 pr-7 text-center"
                        />
                        <span className="pointer-events-none absolute right-2.5 top-2 text-sm text-slate-400">
                          %
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 px-5 py-4">
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={outOfRange}>
          Save commission rates
        </Button>
        {outOfRange && (
          <p className="text-sm text-red-700">Rates must be between 5% and 15%.</p>
        )}
        {save.isSuccess && !outOfRange && (
          <p role="status" className="text-sm font-medium text-emerald-700">
            Commission rates saved
          </p>
        )}
        {save.isError && (
          <p role="alert" className="text-sm text-red-700">
            {errorMessage(save.error)}
          </p>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Carriers — which of the approved services suppliers may pick
 * ------------------------------------------------------------------ */

function CarrierSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.admin.settings('carriers'),
    queryFn: () => api.get<{ enabled: CarrierCode[] }>(endpoints.admin.settings.carriers),
  });

  const [enabled, setEnabled] = React.useState<CarrierCode[] | null>(null);
  const current = enabled ?? query.data?.enabled ?? [];

  const save = useMutation({
    mutationFn: () => api.put(endpoints.admin.settings.carriers, { enabled: current }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings('carriers') }),
  });

  if (query.isLoading) return <LoadingState />;

  return (
    <Card>
      <CardHeader
        title="Approved carriers"
        description="Suppliers can only choose from the services enabled here. Free-text carrier entry is not possible anywhere in the platform."
      />

      <div className="p-5">
        <p className="mb-4 rounded-lg bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
          Every service on this list is tracked with a signature required on delivery, as required by
          the platform policy. Services that do not meet that standard cannot be added.
        </p>

        <fieldset>
          <legend className="sr-only">Enabled carrier services</legend>
          <ul className="space-y-3">
            {APPROVED_CARRIERS.map((carrier) => (
              <li
                key={carrier.code}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3"
              >
                <Checkbox
                  id={`carrier-${carrier.code}`}
                  checked={current.includes(carrier.code)}
                  onChange={() =>
                    setEnabled(
                      current.includes(carrier.code)
                        ? current.filter((code) => code !== carrier.code)
                        : [...current, carrier.code],
                    )
                  }
                  label={<span className="font-medium text-slate-900">{carrier.label}</span>}
                />
                <div className="flex shrink-0 gap-1.5">
                  <StatusBadge label="Tracked" tone="success" size="sm" />
                  <StatusBadge label="Signature" tone="success" size="sm" />
                </div>
              </li>
            ))}
          </ul>
        </fieldset>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 px-5 py-4">
        <Button onClick={() => save.mutate()} loading={save.isPending} disabled={current.length === 0}>
          Save carrier list
        </Button>
        {current.length === 0 && (
          <p className="text-sm text-red-700">At least one carrier must remain enabled.</p>
        )}
        {save.isSuccess && (
          <p role="status" className="text-sm font-medium text-emerald-700">
            Carrier list saved
          </p>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Notification templates
 * ------------------------------------------------------------------ */

interface Template {
  id: string;
  name: string;
  subject: string;
  updatedAt: string;
}

function TemplateSettings() {
  const query = useQuery({
    queryKey: queryKeys.admin.settings('templates'),
    queryFn: () => api.get<Template[]>(endpoints.admin.settings.templates),
  });

  const [editing, setEditing] = React.useState<string | null>(null);
  const [subject, setSubject] = React.useState('');

  const save = useMutation({
    mutationFn: (id: string) => api.put(endpoints.admin.settings.templates, { id, subject }),
    onSuccess: () => setEditing(null),
  });

  if (query.isLoading) return <LoadingState />;

  return (
    <Card>
      <CardHeader
        title="Notification templates"
        description="Subject lines for the transactional emails the platform sends."
      />
      <ul className="divide-y divide-slate-100">
        {(query.data ?? []).map((template) => (
          <li key={template.id} className="p-5">
            {editing === template.id ? (
              <div className="space-y-3">
                <Field id={`subject-${template.id}`} label={`${template.name} — subject line`}>
                  <Input
                    id={`subject-${template.id}`}
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                  />
                </Field>
                <p className="text-xs text-slate-500">
                  Use <code className="font-mono">{'{{reference}}'}</code> and{' '}
                  <code className="font-mono">{'{{firstName}}'}</code> as placeholders.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => save.mutate(template.id)} loading={save.isPending}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{template.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-600">{template.subject}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Updated {formatDate(template.updatedAt)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditing(template.id);
                    setSubject(template.subject);
                  }}
                >
                  Edit
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * VAT defaults
 * ------------------------------------------------------------------ */

function VatSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.admin.settings('vat'),
    queryFn: () => api.get<{ defaultScheme: VatScheme; ratePercent: number }>(endpoints.admin.settings.vat),
  });

  const [scheme, setScheme] = React.useState<VatScheme | null>(null);
  const current = scheme ?? query.data?.defaultScheme ?? 'MARGIN';

  const save = useMutation({
    mutationFn: () => api.put(endpoints.admin.settings.vat, { defaultScheme: current }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.settings('vat') }),
  });

  if (query.isLoading) return <LoadingState />;

  return (
    <Card>
      <CardHeader
        title="VAT defaults"
        description="The scheme pre-selected when creating a new catalogue listing. It can still be changed per listing."
      />
      <div className="space-y-5 p-5">
        <Field
          id="vat-default"
          label="Default VAT scheme"
          hint="Most used and refurbished electronics are sold under the Margin Scheme."
        >
          <Select
            id="vat-default"
            value={current}
            onChange={(event) => setScheme(event.target.value as VatScheme)}
            className="sm:max-w-xs"
            options={[
              { value: 'MARGIN', label: 'Margin Scheme' },
              { value: 'STANDARD', label: 'Standard VAT' },
            ]}
          />
        </Field>

        <div className="rounded-lg bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
          <p className="font-medium text-slate-900">A note on VAT</p>
          <p className="mt-1">
            VAT treatment is declared per listing and appears on the platform commission invoice
            generated for each completed transaction. Confirm the correct scheme with your
            accountant — the platform records what you declare, it does not advise on it.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 px-5 py-4">
        <Button onClick={() => save.mutate()} loading={save.isPending}>
          Save VAT defaults
        </Button>
        {save.isSuccess && (
          <p role="status" className="text-sm font-medium text-emerald-700">
            VAT defaults saved
          </p>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Allocation algorithm — read-only reference
 * ------------------------------------------------------------------ */

function AllocationSettings() {
  const weights = [
    {
      label: 'Supplier tier',
      weight: ALLOCATION_WEIGHTS.supplierTier,
      detail: 'Premium 4pts · Gold 3pts · Silver 2pts · Bronze 1pt',
    },
    {
      label: 'Geographic proximity',
      weight: ALLOCATION_WEIGHTS.geographicProximity,
      detail: 'Postcode distance between supplier and buyer — closer scores higher',
    },
    {
      label: 'Stock quantity',
      weight: ALLOCATION_WEIGHTS.stockQuantity,
      detail: 'Suppliers holding more available units score higher',
    },
    {
      label: 'Order fulfilment rate',
      weight: ALLOCATION_WEIGHTS.fulfilmentRate,
      detail: 'Historical on-time confirmation and dispatch within SLA',
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Order allocation algorithm"
          description="Runs server-side on every order placement. Shown here for reference — weights are fixed in Phase 1."
        />
        <ul className="divide-y divide-slate-100">
          {weights.map((entry) => (
            <li key={entry.label} className="px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{entry.label}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{entry.detail}</p>
                </div>
                <span className="shrink-0 text-lg font-bold text-slate-900">
                  {Math.round(entry.weight * 100)}%
                </span>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-brand-600"
                  style={{ width: `${entry.weight * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-slate-900">Tiebreaker and exclusions</h2>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
          <li>
            <span className="font-medium text-slate-900">Tiebreaker:</span> where two or more
            suppliers score equally, the order goes to whoever has waited longest since their last
            allocation, giving a fair round-robin.
          </li>
          <li>
            <span className="font-medium text-slate-900">Hard exclusion:</span> suspended accounts
            and accounts under review are never allocated orders.
          </li>
          <li>
            <span className="font-medium text-slate-900">Hard exclusion:</span> suppliers who have
            missed three or more consecutive confirmation SLAs are excluded until reinstated.
          </li>
          <li>
            <span className="font-medium text-slate-900">Reallocation:</span> an unconfirmed order
            auto-cancels after 1 business day, the buyer is refunded in full, and the algorithm
            re-runs against the next best-matched supplier.
          </li>
        </ul>
      </Card>
    </div>
  );
}
