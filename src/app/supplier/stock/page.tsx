"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Plus, PackageX, Boxes, Smartphone } from "lucide-react";
import { PageHead } from "@/components/admin/page-head";
import { ActingForBar, useActingSupplier } from "@/components/admin/acting-supplier";
import { ConditionBadge, StatusBadge } from "@/shared/components/badges";
import { formatDate } from "@/shared/lib/format";
import { ApiError } from "@/lib/api/http";
import * as api from "@/lib/api/fulfilment-api";
import type { StockSubmission } from "@/lib/api/fulfilment-api";

/**
 * The stock a seller is holding.
 *
 * Grouped by submission — one product, one grade, the batch they added
 * together — because that is the unit a seller thinks in and the unit they can
 * withdraw.
 *
 * Withdrawing takes the unsold units off sale and leaves the rest alone.
 * Anything already reserved against an order stays: that sale is in progress
 * and is not the seller's to cancel from here.
 */

const TABS = [
  { key: "ACTIVE", label: "On sale" },
  { key: "EXHAUSTED", label: "Sold out" },
  { key: "WITHDRAWN", label: "Withdrawn" },
] as const;

const TONE: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  ACTIVE: "success",
  EXHAUSTED: "neutral",
  WITHDRAWN: "warning",
  AVAILABLE: "success",
  RESERVED: "info",
  SOLD: "neutral",
};
const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, " ");

export default function MyStockPage() {
  const acting = useActingSupplier();
  const [tab, setTab] = React.useState<(typeof TABS)[number]["key"]>("ACTIVE");
  const [rows, setRows] = React.useState<StockSubmission[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [working, setWorking] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    if (acting.blocked || !acting.ready) return;
    setRows(null);
    setError(null);
    try {
      setRows(await api.myStock({ status: tab, supplierId: acting.supplierId }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load your stock.");
      setRows([]);
    }
  }, [tab, acting.supplierId, acting.blocked, acting.ready]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function withdraw(submission: StockSubmission) {
    const sellable = submission.units.filter((u) => u.status === "AVAILABLE").length;
    const confirmed = window.confirm(
      `Take ${sellable} unsold unit${sellable === 1 ? "" : "s"} of ${submission.listingTitle} off sale?\n\n` +
        "Anything already reserved against an order stays — that sale is in progress.",
    );
    if (!confirmed) return;
    setWorking(submission.id);
    try {
      await api.withdrawStock(submission.id, acting.supplierId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not withdraw that stock.");
    } finally {
      setWorking(null);
    }
  }

  const totalAvailable = (rows ?? []).reduce((sum, r) => sum + r.availableUnits, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHead
        title="My stock"
        description="The devices you are holding, and what is on sale right now."
        actions={
          <Link
            href="/supplier/stock/new"
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
          >
            <Plus className="size-4" /> Submit stock
          </Link>
        }
      />

      <ActingForBar acting={acting} id="acting-for-mystock" note="Showing this supplier's stock." />

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={
              "focus-ring rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors " +
              (tab === t.key
                ? "bg-primary text-primary-foreground"
                : "border border-border text-fg-muted hover:bg-surface-inset")
            }
          >
            {t.label}
          </button>
        ))}
        {tab === "ACTIVE" && rows && rows.length > 0 && (
          <span className="ml-auto self-center text-sm text-fg-muted">
            <span className="measure font-semibold text-foreground">{totalAvailable}</span> unit
            {totalAvailable === 1 ? "" : "s"} free to sell
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {acting.blocked ? (
        <p className="rounded-panel border border-border bg-card px-5 py-10 text-center text-sm text-fg-muted">
          Choose a supplier above to see their stock.
        </p>
      ) : !rows ? (
        <p className="flex items-center justify-center gap-2 py-12 text-sm text-fg-muted">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </p>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-panel border border-border bg-card px-6 py-14 text-center">
          <div className="grid size-16 place-items-center rounded-full bg-surface-inset">
            <Boxes className="size-7 text-fg-subtle" />
          </div>
          <div>
            <p className="font-semibold">
              {tab === "ACTIVE" ? "Nothing on sale" : `Nothing ${TABS.find((t) => t.key === tab)?.label.toLowerCase()}`}
            </p>
            <p className="mt-1 text-sm text-fg-muted">
              {tab === "ACTIVE"
                ? "Add devices against a catalogue product and they go on sale immediately."
                : "Nothing to show in this tab."}
            </p>
          </div>
          {tab === "ACTIVE" && (
            <Link
              href="/supplier/stock/new"
              className="focus-ring rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
            >
              Submit stock
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((submission) => (
            <article key={submission.id} className="overflow-hidden rounded-panel border border-border bg-card">
              <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {submission.listingTitle ?? "Unknown product"}
                  </p>
                  <p className="text-xs text-fg-muted">
                    Added {formatDate(submission.createdAt)}
                    {submission.colour && ` · ${submission.colour}`}
                  </p>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <ConditionBadge grade={submission.conditionGrade} size="sm" />
                  <StatusBadge label={label(submission.status)} tone={TONE[submission.status] ?? "neutral"} size="sm" />
                  <span className="measure text-sm font-semibold">
                    {submission.availableUnits}/{submission.units.length} free
                  </span>
                </div>
              </header>

              <div className="flex flex-col gap-3 px-5 py-4">
                <ul className="flex flex-wrap gap-1.5">
                  {submission.units.map((unit) => (
                    <li
                      key={unit.id}
                      className="inline-flex items-center gap-1.5 rounded-md bg-surface-inset px-2 py-1 text-xs"
                      title={`${unit.status.toLowerCase()}`}
                    >
                      <Smartphone className="size-3 text-fg-subtle" />
                      <span className="measure">{unit.imei ?? unit.serialNumber}</span>
                      {unit.batteryHealthPercent != null && (
                        <span className="text-fg-subtle">· {unit.batteryHealthPercent}%</span>
                      )}
                      <StatusBadge label={label(unit.status)} tone={TONE[unit.status] ?? "neutral"} size="sm" />
                    </li>
                  ))}
                </ul>

                {submission.supplierNotes && (
                  <p className="text-xs text-fg-muted">Note: {submission.supplierNotes}</p>
                )}

                {submission.status === "ACTIVE" && submission.availableUnits > 0 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => withdraw(submission)}
                      disabled={working === submission.id}
                      className="focus-ring inline-flex items-center gap-2 rounded-full border border-destructive/40 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                    >
                      {working === submission.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <PackageX className="size-4" />
                      )}
                      Take off sale
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
