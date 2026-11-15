"use client";

import * as React from "react";
import { Loader2, CheckCircle2, MapPin, Landmark, Info, Truck } from "lucide-react";
import { PageHead } from "@/components/admin/page-head";
import { ActingForBar, useActingSupplier } from "@/components/admin/acting-supplier";
import { TierBadge, StatusBadge } from "@/shared/components/badges";
import { ApiError } from "@/lib/api/http";
import * as api from "@/lib/api/fulfilment-api";
import type { SupplierProfile } from "@/lib/api/fulfilment-api";

/**
 * The details a seller keeps current themselves.
 *
 * Deliberately narrow. Business name, VAT number and trading status identify
 * the business to buyers and to HMRC, so changing those is an administrator
 * action with an audit trail behind it — not a self-service form.
 *
 * The dispatch postcode is the one that matters most and is easiest to
 * overlook: it decides how close a seller is judged to be to a buyer, and so
 * which orders they win. A seller who moves warehouse and forgets this quietly
 * stops getting local orders.
 */
export default function SupplierSettingsPage() {
  const acting = useActingSupplier();
  const [profile, setProfile] = React.useState<SupplierProfile | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    phone: "", line1: "", line2: "", city: "", county: "", postcode: "", dispatchPostcode: "",
  });
  const [bank, setBank] = React.useState({ accountHolderName: "", sortCode: "", accountNumber: "" });

  const load = React.useCallback(async () => {
    if (acting.blocked || !acting.ready) return;
    setProfile(null);
    try {
      const p = await api.supplierProfile(acting.supplierId);
      setProfile(p);
      setForm({
        phone: p.phone ?? "",
        line1: p.addressLine1 ?? "",
        line2: p.addressLine2 ?? "",
        city: p.city ?? "",
        county: p.county ?? "",
        postcode: p.postcode ?? "",
        dispatchPostcode: p.dispatchPostcode ?? "",
      });
      setBank({ accountHolderName: p.bankAccount?.accountHolderName ?? "", sortCode: "", accountNumber: "" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your details.");
    }
  }, [acting.supplierId, acting.blocked, acting.ready]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSaving("profile");
    setError(null);
    setSaved(null);
    try {
      const updated = await api.updateSupplierProfile(
        {
          phone: form.phone || undefined,
          dispatchPostcode: form.dispatchPostcode || undefined,
          address: {
            line1: form.line1,
            line2: form.line2 || undefined,
            city: form.city,
            county: form.county || undefined,
            postcode: form.postcode,
          },
        },
        acting.supplierId,
      );
      setProfile(updated);
      setSaved("Your details are up to date.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save those details.");
    } finally {
      setSaving(null);
    }
  }

  async function saveBank(event: React.FormEvent) {
    event.preventDefault();
    setSaving("bank");
    setError(null);
    setSaved(null);
    try {
      const updated = await api.updateBankAccount(bank, acting.supplierId);
      setProfile(updated);
      setBank({ accountHolderName: updated.bankAccount?.accountHolderName ?? "", sortCode: "", accountNumber: "" });
      setSaved("Bank details saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save those bank details.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHead title="Settings" description="How we reach you, and where your parcels are posted from." />

      <ActingForBar acting={acting} id="acting-for-settings" note="Editing this supplier's details." />

      {saved && (
        <p className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm font-medium text-success">
          <CheckCircle2 className="size-4 shrink-0" /> {saved}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {acting.blocked ? (
        <p className="rounded-panel border border-border bg-card px-5 py-10 text-center text-sm text-fg-muted">
          Choose a supplier above to edit their details.
        </p>
      ) : !profile ? (
        <p className="flex items-center justify-center gap-2 py-12 text-sm text-fg-muted">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </p>
      ) : (
        <>
          {/* Set by the platform, not editable here. */}
          <section className="flex flex-wrap items-center gap-4 rounded-panel border border-border bg-card p-5">
            <div className="min-w-0">
              <p className="font-display text-lg font-bold">{profile.businessName}</p>
              <p className="text-sm text-fg-muted">{profile.email}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <TierBadge tier={profile.tier as never} />
              <StatusBadge
                label={profile.status.charAt(0) + profile.status.slice(1).toLowerCase()}
                tone={profile.status === "ACTIVE" ? "success" : "warning"}
                size="sm"
              />
            </div>
            <p className="w-full border-t border-border pt-3 text-xs text-fg-subtle">
              Business name, trading status and tier are set by the platform. Tier follows the
              stock you hold; ask an administrator if a business detail needs changing.
            </p>
          </section>

          <form onSubmit={saveProfile} className="flex flex-col gap-4 rounded-panel border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-bold">
              <MapPin className="size-4 text-primary" /> Contact and address
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="phone" label="Phone" value={form.phone} onChange={set("phone")} />
              <Field id="line1" label="Address" value={form.line1} onChange={set("line1")} className="sm:col-span-2" />
              <Field id="line2" label="Address line 2 (optional)" value={form.line2} onChange={set("line2")} className="sm:col-span-2" />
              <Field id="city" label="Town or city" value={form.city} onChange={set("city")} />
              <Field id="county" label="County (optional)" value={form.county} onChange={set("county")} />
              <Field id="postcode" label="Postcode" value={form.postcode} onChange={set("postcode")} />
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Truck className="size-4 text-primary" /> Dispatch postcode
              </h3>
              <p className="flex items-start gap-2 text-xs text-fg-muted">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                Where parcels are actually posted from. This decides how close you are judged to
                be to a buyer, which is 30% of the score that allocates orders — keep it correct
                if you move warehouse.
              </p>
              <input
                id="dispatchPostcode"
                value={form.dispatchPostcode}
                onChange={(e) => set("dispatchPostcode")(e.target.value)}
                className="measure h-10 max-w-xs rounded-lg border border-border bg-surface px-3 text-sm"
                placeholder="RG1 1AA"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={saving !== null}
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
              >
                {saving === "profile" && <Loader2 className="size-4 animate-spin" />}
                Save details
              </button>
            </div>
          </form>

          <form onSubmit={saveBank} className="flex flex-col gap-4 rounded-panel border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-bold">
              <Landmark className="size-4 text-primary" /> Bank account
            </h2>
            <p className="text-xs text-fg-muted">
              Where your payouts go.{" "}
              {profile.bankAccount
                ? `Currently ending ${profile.bankAccount.accountNumber}. Enter full details to replace it.`
                : "No account on file yet."}
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                id="accountHolderName"
                label="Account holder"
                value={bank.accountHolderName}
                onChange={(v) => setBank((b) => ({ ...b, accountHolderName: v }))}
                className="sm:col-span-3"
              />
              <Field
                id="sortCode"
                label="Sort code"
                value={bank.sortCode}
                onChange={(v) => setBank((b) => ({ ...b, sortCode: v.replace(/\D/g, "").slice(0, 6) }))}
                placeholder="200000"
              />
              <Field
                id="accountNumber"
                label="Account number"
                value={bank.accountNumber}
                onChange={(v) => setBank((b) => ({ ...b, accountNumber: v.replace(/\D/g, "").slice(0, 8) }))}
                placeholder="12345678"
              />
            </div>
            <div>
              <button
                type="submit"
                disabled={saving !== null || bank.sortCode.length !== 6 || bank.accountNumber.length !== 8}
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
              >
                {saving === "bank" && <Loader2 className="size-4 animate-spin" />}
                Save bank details
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function Field({
  id, label, value, onChange, placeholder, className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label htmlFor={id} className="text-xs font-semibold text-fg-muted">
        {label}
      </label>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-border bg-surface px-3 text-sm"
      />
    </div>
  );
}
