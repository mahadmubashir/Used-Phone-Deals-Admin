"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Search, CheckCircle2, Info } from "lucide-react";
import { PageHead } from "@/components/admin/page-head";
import { ActingForBar, useActingSupplier } from "@/components/admin/acting-supplier";
import { ConditionBadge } from "@/shared/components/badges";
import { ApiError } from "@/lib/api/http";
import * as api from "@/lib/api/fulfilment-api";
import type { CatalogueOption, CategoryRules, ConditionGrade } from "@/lib/api/fulfilment-api";

/**
 * Adding stock to the catalogue.
 *
 * A seller does not create products. They pick a catalogue entry the platform
 * curates and add their own physical units to it — which is what keeps one
 * product at one price per grade, however many sellers hold it.
 *
 * Every unit is entered individually, by IMEI or serial, because that is what
 * the platform reserves against an order and what the supplier is told to pack.
 * Ten identical phones are ten rows, not a quantity of ten.
 *
 * The rules — which identifier, whether battery health is needed, the floor
 * each grade demands — come from the category in the database. This form warns
 * early; the API is still the authority and re-checks everything.
 */

const GRADES: ConditionGrade[] = ["PREMIUM", "EXCELLENT", "GOOD", "FAIR"];
const blankUnit = () => ({ key: Math.random().toString(36).slice(2), identifier: "", battery: "" });

export default function SubmitStockPage() {
  const router = useRouter();
  const acting = useActingSupplier();

  const [options, setOptions] = React.useState<CatalogueOption[]>([]);
  const [rules, setRules] = React.useState<CategoryRules[]>([]);
  const [search, setSearch] = React.useState("");
  const [listingId, setListingId] = React.useState("");
  const [grade, setGrade] = React.useState<ConditionGrade>("GOOD");
  const [colour, setColour] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [units, setUnits] = React.useState([blankUnit()]);

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<string | null>(null);

  React.useEffect(() => {
    api.categoryRules().then(setRules).catch(() => setRules([]));
  }, []);

  // Searching the catalogue goes to the API rather than filtering a page of
  // results, so a seller can find a listing that is not in the first sixty.
  React.useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      api
        .catalogueOptions(search.trim() || undefined)
        .then((rows) => active && setOptions(rows))
        .catch(() => active && setOptions([]));
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  const listing = options.find((o) => o.id === listingId) ?? null;
  const rule = rules.find((r) => r.slug === listing?.categorySlug) ?? null;
  const identifierLabel = rule?.identifierType === "SERIAL" ? "Serial number" : "IMEI";
  const floor = api.BATTERY_FLOOR[grade];

  const setUnit = (key: string, field: "identifier" | "battery", value: string) =>
    setUnits((list) => list.map((u) => (u.key === key ? { ...u, [field]: value } : u)));

  /** Pasting a column of identifiers from a spreadsheet fills the rows, which
   *  is how a seller with thirty handsets actually works. */
  function handlePaste(event: React.ClipboardEvent, key: string) {
    const lines = event.clipboardData
      .getData("text")
      .split(/[\r\n,;\t]+/)
      .map((v) => v.trim())
      .filter(Boolean);
    if (lines.length < 2) return;
    event.preventDefault();
    setUnits((list) => {
      const index = list.findIndex((u) => u.key === key);
      const before = list.slice(0, index);
      const after = list.slice(index + 1);
      const pasted = lines.map((identifier) => ({ ...blankUnit(), identifier }));
      return [...before, ...pasted, ...after];
    });
  }

  const filled = units.filter((u) => u.identifier.trim());
  const lowBattery = rule?.requiresBatteryHealth
    ? filled.filter((u) => u.battery !== "" && Number(u.battery) < floor)
    : [];
  const missingBattery = rule?.requiresBatteryHealth
    ? filled.filter((u) => u.battery === "")
    : [];
  const duplicates = filled
    .map((u) => u.identifier.trim())
    .filter((id, i, all) => all.indexOf(id) !== i);

  const canSubmit =
    !!listingId &&
    filled.length > 0 &&
    lowBattery.length === 0 &&
    missingBattery.length === 0 &&
    duplicates.length === 0 &&
    !acting.blocked;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const submission = await api.submitStock(
        {
          listingId,
          conditionGrade: grade,
          colour: colour.trim() || undefined,
          supplierNotes: notes.trim() || undefined,
          units: filled.map((u) => ({
            ...(rule?.identifierType === "SERIAL"
              ? { serialNumber: u.identifier.trim() }
              : { imei: u.identifier.trim() }),
            ...(rule?.requiresBatteryHealth ? { batteryHealthPercent: Number(u.battery) } : {}),
          })),
        },
        acting.supplierId,
      );
      setDone(`${submission.units.length} unit${submission.units.length === 1 ? "" : "s"} added and on sale.`);
      setUnits([blankUnit()]);
      setColour("");
      setNotes("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add that stock.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHead
        title="Submit stock"
        description="Add your own units against a product in the platform catalogue."
      />

      <ActingForBar acting={acting} id="acting-for-stock" note="Stock is added to this supplier's account." />

      {done && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm font-medium text-success">
          <CheckCircle2 className="size-4 shrink-0" />
          {done}
          <button
            type="button"
            onClick={() => router.push("/supplier/stock")}
            className="focus-ring ml-auto rounded-full border border-success/40 px-3 py-1 text-xs font-semibold"
          >
            View my stock
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 1. The product */}
        <section className="flex flex-col gap-3 rounded-panel border border-border bg-card p-5">
          <h2 className="font-display text-base font-bold">1. Which product</h2>
          <p className="text-xs text-fg-subtle">
            Sellers add stock to products the platform already lists. If what you hold is not
            here, ask an administrator to add it to the catalogue.
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the catalogue…"
              className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
            required
            className="h-10 rounded-lg border border-border bg-surface px-3 text-sm"
          >
            <option value="">Choose a product…</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title} — {o.categoryName}
              </option>
            ))}
          </select>
          {listing && rule && (
            <p className="flex items-start gap-2 rounded-lg bg-surface-inset px-3 py-2 text-xs text-fg-muted">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              {listing.categoryName} needs a{rule.identifierType === "IMEI" ? "n " : " "}
              <strong>{identifierLabel}</strong> for every unit
              {rule.requiresBatteryHealth && ", and battery health"}. {listing.totalStock} unit
              {listing.totalStock === 1 ? " is" : "s are"} already on sale across all sellers.
            </p>
          )}
        </section>

        {/* 2. Condition */}
        <section className="flex flex-col gap-3 rounded-panel border border-border bg-card p-5">
          <h2 className="font-display text-base font-bold">2. Condition</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GRADES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrade(g)}
                aria-pressed={grade === g}
                className={
                  "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors " +
                  (grade === g ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-border-strong")
                }
              >
                <ConditionBadge grade={g} size="sm" />
                <span className="text-xs text-fg-muted">
                  Battery {api.BATTERY_FLOOR[g]}%+
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-fg-subtle">
            The grade describes cosmetic condition. The platform sets the price for each grade —
            you are not pricing these units.
          </p>
          {rule?.requiresColour && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="colour" className="text-xs font-semibold text-fg-muted">
                Colour
              </label>
              <input
                id="colour"
                value={colour}
                onChange={(e) => setColour(e.target.value)}
                placeholder="Midnight"
                className="h-10 max-w-xs rounded-lg border border-border bg-surface px-3 text-sm"
              />
            </div>
          )}
        </section>

        {/* 3. The units */}
        <section className="flex flex-col gap-3 rounded-panel border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold">
              3. The devices{filled.length > 0 && ` — ${filled.length}`}
            </h2>
            <button
              type="button"
              onClick={() => setUnits((l) => [...l, blankUnit()])}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-inset"
            >
              <Plus className="size-3.5" /> Add another
            </button>
          </div>
          <p className="text-xs text-fg-subtle">
            One row per physical device — that is what gets reserved when someone buys, and what
            you will be told to pack. Paste a column from a spreadsheet to fill several at once.
          </p>

          <ul className="flex flex-col gap-2">
            {units.map((unit, index) => {
              const identifier = unit.identifier.trim();
              const isDuplicate = identifier !== "" && duplicates.includes(identifier);
              const battery = unit.battery === "" ? null : Number(unit.battery);
              const tooLow = battery !== null && rule?.requiresBatteryHealth && battery < floor;
              return (
                <li key={unit.key} className="flex flex-wrap items-start gap-2">
                  <span className="mt-2.5 w-6 shrink-0 text-right text-xs text-fg-subtle">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <input
                      value={unit.identifier}
                      onChange={(e) => setUnit(unit.key, "identifier", e.target.value)}
                      onPaste={(e) => handlePaste(e, unit.key)}
                      placeholder={identifierLabel}
                      aria-label={`${identifierLabel} for device ${index + 1}`}
                      aria-invalid={isDuplicate}
                      className={
                        "measure h-10 w-full rounded-lg border bg-surface px-3 text-sm " +
                        (isDuplicate ? "border-destructive" : "border-border")
                      }
                    />
                    {isDuplicate && (
                      <p className="mt-1 text-xs text-destructive">
                        Already entered above — each device appears once.
                      </p>
                    )}
                  </div>
                  {rule?.requiresBatteryHealth && (
                    <div className="w-28">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={unit.battery}
                        onChange={(e) => setUnit(unit.key, "battery", e.target.value)}
                        placeholder="Battery %"
                        aria-label={`Battery health for device ${index + 1}`}
                        aria-invalid={Boolean(tooLow)}
                        className={
                          "measure h-10 w-full rounded-lg border bg-surface px-3 text-sm " +
                          (tooLow ? "border-destructive" : "border-border")
                        }
                      />
                      {tooLow && <p className="mt-1 text-xs text-destructive">Below {floor}%</p>}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setUnits((l) => (l.length === 1 ? [blankUnit()] : l.filter((u) => u.key !== unit.key)))}
                    aria-label={`Remove device ${index + 1}`}
                    className="focus-ring mt-1 rounded-md p-2 text-fg-subtle hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>

          {lowBattery.length > 0 && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
              {lowBattery.length} device{lowBattery.length === 1 ? "" : "s"} below the {floor}%
              floor for {grade.toLowerCase()}. Either correct the reading or submit them at a
              lower grade.
            </p>
          )}
          {missingBattery.length > 0 && (
            <p className="text-xs text-fg-muted">
              Battery health is required for every device in this category.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="notes" className="text-xs font-semibold text-fg-muted">
              Notes for the platform (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              placeholder="Anything the team should know about this batch."
            />
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving
              ? "Adding…"
              : filled.length === 0
                ? "Add devices to sale"
                : `Add ${filled.length} device${filled.length === 1 ? "" : "s"} to sale`}
          </button>
          <p className="text-xs text-fg-subtle">
            Goes on sale immediately and can be withdrawn any time before it sells.
          </p>
        </div>
      </form>
    </div>
  );
}
