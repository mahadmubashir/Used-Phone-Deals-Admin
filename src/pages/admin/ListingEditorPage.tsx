import * as React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  CATEGORIES,
  Card,
  CardHeader,
  ConditionBadge,
  DataTable,
  ErrorState,
  Field,
  FileUpload,
  Input,
  LoadingState,
  Select,
  StatusBadge,
  Textarea,
  TierBadge,
  WHATS_IN_THE_BOX_OPTIONS,
  Checkbox,
  errorMessage,
  formatPrice,
  hasErrors,
  parsePriceToPence,
  requiredText,
  specFieldsForCategory,
  type CatalogueListing,
  type CategorySlug,
  type Column,
  type ConditionGrade,
  type FieldErrors,
  type SupplierTier,
  type UploadedFile,
  type VatScheme,
} from '@/shared';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { env } from '@/lib/env';
import { PageHeader } from '@/layouts/PortalLayout';

/** Minimum photos required by the Agreement before a listing can go live. */
const MIN_PHOTOS = 4;

interface EditorForm {
  title: string;
  description: string;
  category: CategorySlug;
  brand: string;
  model: string;
  price: string;
  vatScheme: VatScheme;
  specs: Record<string, string>;
  whatsInTheBox: string[];
}

const EMPTY: EditorForm = {
  title: '',
  description: '',
  category: 'mobile-phones',
  brand: '',
  model: '',
  price: '',
  vatScheme: 'MARGIN',
  specs: {},
  whatsInTheBox: [],
};

export function ListingEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';

  const query = useQuery({
    queryKey: queryKeys.admin.listing(id ?? ''),
    queryFn: () => api.get<CatalogueListing>(endpoints.catalogue.byId(id!)),
    enabled: !isNew,
  });

  if (!isNew && query.isLoading) return <LoadingState label="Loading listing…" />;
  if (!isNew && query.isError) {
    return <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />;
  }

  return <Editor listing={query.data} />;
}

function Editor({ listing }: { listing?: CatalogueListing }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isNew = !listing;

  const [form, setForm] = React.useState<EditorForm>(() =>
    listing
      ? {
          title: listing.title,
          description: listing.description,
          category: listing.category,
          brand: listing.brand,
          model: listing.model,
          price: (listing.pricePence / 100).toFixed(2),
          vatScheme: listing.vatScheme,
          specs: Object.fromEntries(
            Object.entries(listing.specs).map(([key, value]) => [key, String(value ?? '')]),
          ),
          whatsInTheBox: listing.whatsInTheBox,
        }
      : EMPTY,
  );

  const [photos, setPhotos] = React.useState<UploadedFile[]>(
    listing?.images.map((image) => ({ id: image.id, url: image.url, name: image.alt })) ?? [],
  );
  const [errors, setErrors] = React.useState<FieldErrors<string>>({});

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        brand: form.brand,
        model: form.model,
        pricePence: parsePriceToPence(form.price) ?? 0,
        vatScheme: form.vatScheme,
        specs: form.specs,
        whatsInTheBox: form.whatsInTheBox,
        imageIds: photos.map((photo) => photo.id),
      };
      return isNew
        ? api.post<CatalogueListing>(endpoints.catalogue.create, payload)
        : api.patch<CatalogueListing>(endpoints.catalogue.update(listing!.id), payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'catalogue'] });
      navigate(`/admin/catalogue/${saved.id}`);
    },
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.upload<UploadedFile>(
        endpoints.catalogue.uploadImage(listing?.id ?? 'draft'),
        formData,
      );
    },
    onSuccess: (uploaded) => setPhotos((current) => [...current, uploaded]),
  });

  const specFields = specFieldsForCategory(form.category).filter(
    (field) => field.key !== 'brand' && field.key !== 'model',
  );

  function validate(): boolean {
    const next: FieldErrors<string> = {
      title: requiredText(form.title, 'Title'),
      description: requiredText(form.description, 'Description'),
      brand: requiredText(form.brand, 'Brand'),
      model: requiredText(form.model, 'Model'),
      price:
        parsePriceToPence(form.price) && parsePriceToPence(form.price)! > 0
          ? undefined
          : 'Enter a valid price',
      photos:
        photos.length >= MIN_PHOTOS
          ? undefined
          : `At least ${MIN_PHOTOS} photos are required before publishing`,
      whatsInTheBox:
        form.whatsInTheBox.length > 0 ? undefined : "Select what's included in the box",
    };
    setErrors(next);
    return !hasErrors(next);
  }

  return (
    <>
      <Link to="/admin/catalogue" className="text-sm font-medium text-brand-700 hover:underline">
        ← Back to catalogue
      </Link>

      <div className="mt-3">
        <PageHeader
          title={isNew ? 'Create listing' : 'Edit listing'}
          description={
            isNew
              ? 'Create a master catalogue entry. Suppliers will submit stock against it.'
              : listing!.title
          }
          actions={
            !isNew && (
              <div className="flex items-center gap-2">
                <StatusBadge
                  label={listing!.status === 'PUBLISHED' ? 'Published' : listing!.status}
                  tone={listing!.status === 'PUBLISHED' ? 'success' : 'warning'}
                />
                <a
                  href={`${env.buyerPortalUrl}/product/${listing!.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    View on site
                  </Button>
                </a>
              </div>
            )
          }
        />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (validate()) save.mutate();
        }}
        noValidate
        className="grid gap-6 xl:grid-cols-[1fr_20rem]"
      >
        <div className="space-y-6">
          {/* ---- Basics ---- */}
          <Card>
            <CardHeader title="Product details" />
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <Field id="title" label="Title" required error={errors.title} className="sm:col-span-2">
                <Input
                  id="title"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  invalid={Boolean(errors.title)}
                  placeholder="Apple iPhone 14 Pro 256GB"
                />
              </Field>

              <Field
                id="description"
                label="Description"
                required
                error={errors.description}
                hint="Shown on the product page. Describe the device honestly — this is what buyers read."
                className="sm:col-span-2"
              >
                <Textarea
                  id="description"
                  rows={5}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  invalid={Boolean(errors.description)}
                />
              </Field>

              <Field id="category" label="Category" required>
                <Select
                  id="category"
                  value={form.category}
                  onChange={(event) =>
                    setForm({ ...form, category: event.target.value as CategorySlug, specs: {} })
                  }
                  options={CATEGORIES.map((entry) => ({ value: entry.slug, label: entry.label }))}
                />
              </Field>

              <Field id="brand" label="Brand" required error={errors.brand}>
                <Input
                  id="brand"
                  value={form.brand}
                  onChange={(event) => setForm({ ...form, brand: event.target.value })}
                  invalid={Boolean(errors.brand)}
                />
              </Field>

              <Field id="model" label="Model" required error={errors.model} className="sm:col-span-2">
                <Input
                  id="model"
                  value={form.model}
                  onChange={(event) => setForm({ ...form, model: event.target.value })}
                  invalid={Boolean(errors.model)}
                />
              </Field>
            </div>
          </Card>

          {/* ---- Category-specific specs ---- */}
          <Card>
            <CardHeader
              title="Specifications"
              description={`Fields shown for ${CATEGORIES.find((c) => c.slug === form.category)?.label}.`}
            />
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              {specFields.map((field) => (
                <Field key={field.key} id={`spec-${field.key}`} label={field.label}>
                  <Input
                    id={`spec-${field.key}`}
                    value={form.specs[field.key] ?? ''}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        specs: { ...form.specs, [field.key]: event.target.value },
                      })
                    }
                    placeholder={field.suffix ? `e.g. 95${field.suffix}` : undefined}
                  />
                </Field>
              ))}
            </div>
          </Card>

          {/* ---- Photos: Admin only ---- */}
          <Card>
            <CardHeader
              title="Product photos"
              description="Uploaded and managed by Admin only — suppliers have no photo upload anywhere in the platform."
            />
            <div className="p-5">
              <FileUpload
                id="photos"
                label="Photos"
                hint={`At least ${MIN_PHOTOS} required. The first photo is used as the main image on listings and search results.`}
                value={photos}
                minFiles={MIN_PHOTOS}
                maxFiles={10}
                maxSizeMb={8}
                onFilesSelected={(files) => files.forEach((file) => upload.mutate(file))}
                onRemove={(photoId) => setPhotos((current) => current.filter((p) => p.id !== photoId))}
                onReorder={(ids) =>
                  setPhotos((current) =>
                    ids.map((photoId) => current.find((p) => p.id === photoId)!).filter(Boolean),
                  )
                }
                error={errors.photos ?? (upload.isError ? errorMessage(upload.error) : undefined)}
              />
            </div>
          </Card>

          {/* ---- What's in the box ---- */}
          <Card>
            <CardHeader
              title="What's in the box"
              description="Shown on the product page. Suppliers confirm this per unit when submitting stock."
            />
            <div className="p-5">
              <fieldset>
                <legend className="sr-only">What&apos;s in the box</legend>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {WHATS_IN_THE_BOX_OPTIONS.map((option) => (
                    <Checkbox
                      key={option}
                      id={`box-${option}`}
                      checked={form.whatsInTheBox.includes(option)}
                      onChange={() =>
                        setForm({
                          ...form,
                          whatsInTheBox: form.whatsInTheBox.includes(option)
                            ? form.whatsInTheBox.filter((v) => v !== option)
                            : [...form.whatsInTheBox, option],
                        })
                      }
                      label={option}
                    />
                  ))}
                </div>
              </fieldset>
              {errors.whatsInTheBox && (
                <p role="alert" className="mt-3 text-xs font-medium text-red-600">
                  {errors.whatsInTheBox}
                </p>
              )}
            </div>
          </Card>

          {!isNew && <SupplierStockPanel listingId={listing!.id} />}
        </div>

        {/* ---- Sidebar: pricing & save ---- */}
        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardHeader
              title="Pricing"
              description="Admin-set and VAT inclusive. Suppliers never see or set this."
            />
            <div className="space-y-5 p-5">
              <Field
                id="price"
                label="Price (VAT inclusive)"
                required
                error={errors.price}
                hint="In pounds, e.g. 629.99"
              >
                <Input
                  id="price"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(event) => setForm({ ...form, price: event.target.value })}
                  invalid={Boolean(errors.price)}
                  placeholder="0.00"
                />
              </Field>

              <Field
                id="vatScheme"
                label="VAT scheme"
                required
                hint="Declared per listing and used on the commission invoice."
              >
                <Select
                  id="vatScheme"
                  value={form.vatScheme}
                  onChange={(event) =>
                    setForm({ ...form, vatScheme: event.target.value as VatScheme })
                  }
                  options={[
                    { value: 'MARGIN', label: 'Margin Scheme' },
                    { value: 'STANDARD', label: 'Standard VAT' },
                  ]}
                />
              </Field>

              {parsePriceToPence(form.price) ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
                  <span className="text-slate-600">Buyers will see </span>
                  <span className="font-semibold text-slate-900">
                    {formatPrice(parsePriceToPence(form.price)!)}
                  </span>
                </p>
              ) : null}
            </div>
          </Card>

          <Card className="p-5">
            {save.isError && (
              <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-800">
                {errorMessage(save.error)}
              </p>
            )}

            <div className="space-y-2">
              <Button type="submit" size="lg" fullWidth loading={save.isPending}>
                {isNew ? 'Create listing' : 'Save changes'}
              </Button>
              <Link to="/admin/catalogue">
                <Button type="button" variant="outline" size="lg" fullWidth>
                  Cancel
                </Button>
              </Link>
            </div>

            {photos.length < MIN_PHOTOS && (
              <p className="mt-3 text-xs text-amber-700">
                {MIN_PHOTOS - photos.length} more{' '}
                {MIN_PHOTOS - photos.length === 1 ? 'photo' : 'photos'} needed before this can be
                published.
              </p>
            )}
          </Card>

          {!isNew && Boolean(listing!.notifyMeCount) && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-slate-900">Waiting list</h2>
              <p className="mt-1 text-2xl font-bold text-slate-900">{listing!.notifyMeCount}</p>
              <p className="mt-0.5 text-xs text-slate-600">
                buyers have asked to be notified when this is back in stock.
              </p>
            </Card>
          )}
        </aside>
      </form>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Which suppliers hold stock against this listing
 * ------------------------------------------------------------------ */

interface StockBreakdownRow {
  supplierId: string;
  supplierName: string;
  tier: SupplierTier;
  quantity: number;
  conditionGrade: ConditionGrade;
}

function SupplierStockPanel({ listingId }: { listingId: string }) {
  const query = useQuery({
    queryKey: queryKeys.admin.listingStock(listingId),
    queryFn: () => api.get<StockBreakdownRow[]>(endpoints.catalogue.stockBreakdown(listingId)),
  });

  const columns: Column<StockBreakdownRow>[] = [
    {
      key: 'supplierName',
      header: 'Supplier',
      sortValue: (row) => row.supplierName,
      render: (row) => (
        <Link
          to={`/admin/suppliers/${row.supplierId}`}
          className="font-medium text-brand-700 hover:underline"
        >
          {row.supplierName}
        </Link>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      sortValue: (row) => row.tier,
      render: (row) => <TierBadge tier={row.tier} />,
    },
    {
      key: 'conditionGrade',
      header: 'Grade',
      render: (row) => <ConditionBadge grade={row.conditionGrade} size="sm" />,
    },
    {
      key: 'quantity',
      header: 'Units',
      align: 'right',
      sortValue: (row) => row.quantity,
      render: (row) => <span className="font-medium text-slate-900">{row.quantity}</span>,
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Supplier stock against this listing"
        description="Internal only. Buyers see a single combined availability and never a supplier name."
      />
      <DataTable
        columns={columns}
        rows={query.data ?? []}
        rowKey={(row) => row.supplierId}
        loading={query.isLoading}
        error={query.isError ? errorMessage(query.error) : null}
        emptyTitle="No supplier stock yet"
        emptyDescription="This listing will show as out of stock on the buyer site until a supplier registers units."
        caption="Supplier stock breakdown"
        className="rounded-none border-0"
        dense
      />
    </Card>
  );
}
