import * as React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  CardHeader,
  Checkbox,
  CONDITION_GRADES,
  ConditionBadge,
  EmptyState,
  Field,
  Input,
  LoadingState,
  Select,
  Spinner,
  categoryLabel,
  errorMessage,
  hasErrors,
  stockFieldsForCategory,
  validateStockSubmission,
  type CatalogueListing,
  type ConditionGrade,
  type FieldErrors,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/layouts/PortalLayout';

/**
 * Supplier stock submission.
 *
 * Suppliers submit stock *against an existing Admin-created catalogue entry*.
 * They cannot create a listing, cannot upload photos, and — note the complete
 * absence of any price input below — cannot set or even see the price. The
 * catalogue-search endpoint strips pricing before it reaches this screen.
 */

/** A catalogue entry as the supplier sees it: no price, no VAT scheme. */
type SupplierCatalogueEntry = Omit<CatalogueListing, 'pricePence' | 'vatScheme'>;

export function SubmitStockPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = React.useState<SupplierCatalogueEntry | null>(null);

  return (
    <>
      <PageHeader
        title="Submit stock"
        description="Find the catalogue listing your device matches, then tell us about the unit you hold."
      />

      {selected ? (
        <StockForm
          listing={selected}
          onBack={() => setSelected(null)}
          onSubmitted={() => navigate('/supplier/stock')}
        />
      ) : (
        <CatalogueSearch onSelect={setSelected} />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Step 1 — find the catalogue entry
 * ------------------------------------------------------------------ */

function CatalogueSearch({ onSelect }: { onSelect: (entry: SupplierCatalogueEntry) => void }) {
  const [term, setTerm] = React.useState('');
  const [debounced, setDebounced] = React.useState('');

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(term), 300);
    return () => window.clearTimeout(timer);
  }, [term]);

  const query = useQuery({
    queryKey: queryKeys.supplier.catalogueSearch(debounced),
    queryFn: () =>
      api.get<SupplierCatalogueEntry[]>(endpoints.supplier.catalogueSearch, {
        query: { search: debounced },
      }),
    enabled: debounced.length === 0 || debounced.length >= 2,
  });

  return (
    <Card>
      <CardHeader
        title="Step 1 — choose the product"
        description="Only products already in the UsedPhoneDeals catalogue can be stocked. If the exact model is missing, ask the Admin team to add it."
      />

      <div className="p-5">
        <Field id="catalogue-search" label="Search the catalogue">
          <div className="relative">
            <Input
              id="catalogue-search"
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="iPhone 14 Pro, MacBook Air M2, Galaxy Watch…"
              autoFocus
            />
            {query.isFetching && (
              <Spinner className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
            )}
          </div>
        </Field>

        <div className="mt-5">
          {query.isLoading ? (
            <LoadingState />
          ) : (query.data ?? []).length === 0 ? (
            <EmptyState
              title="No matching products"
              description="Try a shorter search term. If the model genuinely isn't listed, contact the Admin team and they will add it to the catalogue."
            />
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {query.data!.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(entry)}
                    className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
                  >
                    <img
                      src={entry.images[0]?.url}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg bg-slate-50 object-contain p-1"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{entry.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {categoryLabel(entry.category)} · {entry.brand} {entry.model}
                      </p>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-5 w-5 shrink-0 text-slate-400"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Step 2 — describe the unit
 * ------------------------------------------------------------------ */

function StockForm({
  listing,
  onBack,
  onSubmitted,
}: {
  listing: SupplierCatalogueEntry;
  onBack: () => void;
  onSubmitted: () => void;
}) {
  const fields = stockFieldsForCategory(listing.category);
  const [values, setValues] = React.useState<Record<string, unknown>>({
    quantity: 1,
    whatsInTheBox: [] as string[],
  });
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const submit = useMutation({
    mutationFn: () =>
      api.post(endpoints.supplier.submitStock, {
        listingId: listing.id,
        category: listing.category,
        ...values,
      }),
    onSuccess: onSubmitted,
  });

  function set(key: string, value: unknown) {
    const next = { ...values, [key]: value };
    setValues(next);
    if (touched[key]) {
      setErrors(validateStockSubmission(listing.category, next));
    }
  }

  function blur(key: string) {
    setTouched((current) => ({ ...current, [key]: true }));
    setErrors(validateStockSubmission(listing.category, values));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const next = validateStockSubmission(listing.category, values);
    setErrors(next);
    setTouched(Object.fromEntries(fields.map((field) => [field.key, true])));
    if (hasErrors(next)) return;
    submit.mutate();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {/* ---- Chosen product ---- */}
      <Card>
        <CardHeader
          title="Step 2 — the unit you hold"
          description="Grade each individual unit honestly. Consistent grading is what keeps returns low."
          action={
            <Button type="button" variant="ghost" size="sm" onClick={onBack}>
              Change product
            </Button>
          }
        />

        <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
          <img
            src={listing.images[0]?.url}
            alt=""
            className="h-16 w-16 shrink-0 rounded-lg bg-white object-contain p-1.5"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{listing.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {categoryLabel(listing.category)} · {listing.brand} {listing.model}
            </p>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2">
          {fields.map((field) => {
            if (field.kind === 'checklist') return null;

            const error = touched[field.key] ? errors[field.key] : undefined;

            return (
              <Field
                key={field.key}
                id={field.key}
                label={field.label}
                required={field.required}
                error={error}
                hint={field.help}
                className={field.key === 'imei' || field.key === 'serialNumber' ? 'sm:col-span-2' : ''}
              >
                {field.kind === 'select' ? (
                  field.key === 'conditionGrade' ? (
                    <Select
                      id={field.key}
                      value={(values[field.key] as string) ?? ''}
                      onChange={(event) => set(field.key, event.target.value)}
                      onBlur={() => blur(field.key)}
                      placeholder="Choose a grade…"
                      invalid={Boolean(error)}
                      options={CONDITION_GRADES.map((grade) => ({
                        value: grade.value,
                        label: grade.label,
                      }))}
                    />
                  ) : (
                    <Select
                      id={field.key}
                      value={(values[field.key] as string) ?? ''}
                      onChange={(event) => set(field.key, event.target.value)}
                      onBlur={() => blur(field.key)}
                      placeholder="Choose…"
                      invalid={Boolean(error)}
                      options={(field.options ?? []).map((option) => ({
                        value: option,
                        label: option,
                      }))}
                    />
                  )
                ) : (
                  <Input
                    id={field.key}
                    type={field.kind === 'number' ? 'number' : 'text'}
                    inputMode={field.kind === 'number' ? 'numeric' : undefined}
                    min={field.min}
                    max={field.max}
                    value={(values[field.key] as string | number | undefined) ?? ''}
                    onChange={(event) =>
                      set(
                        field.key,
                        field.kind === 'number' ? Number(event.target.value) : event.target.value,
                      )
                    }
                    onBlur={() => blur(field.key)}
                    invalid={Boolean(error)}
                    className={field.key === 'imei' ? 'font-mono' : undefined}
                  />
                )}
              </Field>
            );
          })}
        </div>

        {/* ---- Grading guidance ---- */}
        {Boolean(values.conditionGrade) && (
          <div className="mx-5 mb-5 rounded-lg bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <ConditionBadge grade={values.conditionGrade as ConditionGrade} size="sm" />
              <p className="text-xs font-semibold text-slate-900">means</p>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
              {CONDITION_GRADES.find((g) => g.value === values.conditionGrade)?.description}
            </p>
          </div>
        )}
      </Card>

      {/* ---- What's in the box ---- */}
      <Card>
        <CardHeader
          title="What's in the box"
          description="Tick everything that ships with this unit. This appears on the buyer's product page."
        />
        <div className="p-5">
          <fieldset>
            <legend className="sr-only">What&apos;s in the box</legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(fields.find((f) => f.kind === 'checklist')?.options ?? []).map((option) => {
                const current = (values.whatsInTheBox as string[]) ?? [];
                return (
                  <Checkbox
                    key={option}
                    id={`box-${option}`}
                    checked={current.includes(option)}
                    onChange={() => {
                      set(
                        'whatsInTheBox',
                        current.includes(option)
                          ? current.filter((v) => v !== option)
                          : [...current, option],
                      );
                      setTouched((t) => ({ ...t, whatsInTheBox: true }));
                    }}
                    label={option}
                  />
                );
              })}
            </div>
          </fieldset>
          {touched.whatsInTheBox && errors.whatsInTheBox && (
            <p role="alert" className="mt-3 text-xs font-medium text-red-600">
              {errors.whatsInTheBox}
            </p>
          )}
        </div>
      </Card>

      {/* ---- Submit ---- */}
      <Card className="p-5">
        <div className="rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
          <p className="font-medium text-slate-900">A note on pricing and photos</p>
          <p className="mt-1">
            Pricing and product photography are managed centrally by the UsedPhoneDeals admin team —
            you never need to set a price or upload images. Your submission simply registers the
            units you hold against this listing.
          </p>
        </div>

        {submit.isError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800">
            {errorMessage(submit.error)}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <Button type="submit" size="lg" loading={submit.isPending}>
            Submit stock
          </Button>
          <Link to="/supplier/stock">
            <Button type="button" variant="outline" size="lg">
              Cancel
            </Button>
          </Link>
        </div>
      </Card>
    </form>
  );
}
