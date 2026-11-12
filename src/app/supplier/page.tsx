"use client";

import * as React from "react";
import Link from "next/link";
import {
  Loader2,
  PackageCheck,
  Truck,
  Boxes,
  Wallet,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { StatTile } from "@/components/admin/stat-tile";
import { PageHead } from "@/components/admin/page-head";
import { TierBadge, StatusBadge } from "@/shared/components/badges";
import { formatPrice, formatDate } from "@/shared/lib/format";
import { ActingForBar, useActingSupplier } from "@/components/admin/acting-supplier";
import { ApiError } from "@/lib/api/http";
import * as api from "@/lib/api/fulfilment-api";
import type { SupplierOverview } from "@/lib/api/fulfilment-api";

/**
 * The supplier's home screen.
 *
 * Three questions, in the order a supplier actually asks them: what needs
 * doing right now, what am I holding, and what have I earned. Everything is
 * counted from the orders and stock themselves, so none of it can drift away
 * from what the queue says.
 *
 * Earnings count only orders that have shipped. An order still waiting to be
 * confirmed is not money, and showing it as money would be a promise the
 * platform has not made.
 */

const TONE: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  PLACED: "warning",
  CONFIRMED: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  COMPLETED: "success",
  CANCELLED: "danger",
};
const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, " ");

export default function SupplierHome() {
  const acting = useActingSupplier();

  const [data, setData] = React.useState<SupplierOverview | null>(null);
  const [error, setError] = React.useState<string | null>(null);


  React.useEffect(() => {
    if (acting.blocked) return;
    let active = true;
    setData(null);
    api
      .supplierOverview(acting.supplierId)
      .then((d) => active && setData(d))
      .catch((err) =>
        active && setError(err instanceof ApiError ? err.message : "Could not load your dashboard."),
      );
    return () => {
      active = false;
    };
  }, [acting.supplierId, acting.blocked]);

  const needsAttention = (data?.counts.awaitingConfirmation ?? 0) + (data?.counts.toDispatch ?? 0);
  const isOwnStock = acting.isOwnStock;

  return (
    <div className="flex flex-col gap-5">
      <PageHead
        title={data?.supplier.businessName ?? "Overview"}
        description="Your orders, your stock and what you have earned."
      />

      <ActingForBar acting={acting} id="acting-for-home" />

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {acting.blocked ? (
        <p className="rounded-panel border border-border bg-card px-5 py-10 text-center text-sm text-fg-muted">
          Choose a supplier above to see their dashboard.
        </p>
      ) : !data ? (
        <p className="flex items-center justify-center gap-2 py-12 text-sm text-fg-muted">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </p>
      ) : (
        <>
          {data.counts.overdueConfirmations > 0 && (
            <p className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm font-medium text-warning">
              <AlertTriangle className="size-4 shrink-0" />
              {data.counts.overdueConfirmations} order
              {data.counts.overdueConfirmations === 1 ? " is" : "s are"} past the confirmation
              deadline. Missing it repeatedly takes you out of allocation.
            </p>
          )}

          {/* What needs doing */}
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
              Needs you now
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label="To confirm"
                value={String(data.counts.awaitingConfirmation)}
                sub="Accept within 1 working day"
                href="/supplier/orders"
                tone={data.counts.awaitingConfirmation > 0 ? "attention" : "neutral"}
              />
              <StatTile
                label="To dispatch"
                value={String(data.counts.toDispatch)}
                sub="Confirmed, awaiting a parcel"
                href="/supplier/orders"
                tone={data.counts.toDispatch > 0 ? "attention" : "neutral"}
              />
              <StatTile
                label="In transit"
                value={String(data.counts.inTransit)}
                sub="With the carrier"
                href="/supplier/orders"
              />
              <StatTile
                label="Delivered"
                value={String(data.counts.delivered)}
                sub="Inside the return window"
                href="/supplier/orders"
              />
            </div>
            {needsAttention === 0 && (
              <p className="text-sm text-fg-muted">
                Nothing waiting on you. New orders appear here the moment they are allocated.
              </p>
            )}
          </section>

          {/* Standing and stock */}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="flex flex-col gap-3 rounded-panel border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-bold">
                <TrendingUp className="size-4 text-primary" /> Your standing
              </h2>
              <dl className="flex flex-col gap-3 text-sm">
                <Row label="Tier">
                  {data.supplier.tier ? <TierBadge tier={data.supplier.tier} /> : "—"}
                </Row>
                <Row label="Fulfilment rate">
                  <span className="measure font-semibold">{data.supplier.fulfilmentRate}%</span>
                </Row>
                <Row label="Missed SLAs in a row">
                  <span className="measure font-semibold">{data.supplier.consecutiveMissedSlas}</span>
                </Row>
              </dl>
              <p className="border-t border-border pt-3 text-xs text-fg-subtle">
                Tier follows the stock you hold. Both tier and fulfilment rate feed the score
                that decides which supplier an order is allocated to — a better tier and a
                cleaner record win more orders.
              </p>
            </section>

            <section className="flex flex-col gap-3 rounded-panel border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-bold">
                <Boxes className="size-4 text-primary" /> Your stock
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <StatTile label="Available now" value={String(data.stock.availableUnits)} sub="Units free to sell" />
                <StatTile label="Across" value={String(data.stock.listings)} sub="Catalogue listings" />
              </div>
              <p className="border-t border-border pt-3 text-xs text-fg-subtle">
                {data.stock.totalStockUnits} units held in total, counting those already
                reserved against an order.
              </p>
            </section>
          </div>

          {/* Earnings */}
          <section className="flex flex-col gap-3 rounded-panel border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-bold">
              <Wallet className="size-4 text-primary" /> Earnings
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatTile
                label="Sales"
                value={formatPrice(data.earnings.grossPence)}
                sub={`${data.earnings.ordersFulfilled} order${data.earnings.ordersFulfilled === 1 ? "" : "s"} dispatched`}
              />
              <StatTile
                label="Commission"
                value={`− ${formatPrice(data.earnings.commissionPence)}`}
                // The platform does not charge itself, so saying "platform fee"
                // over a zero would read as a bug rather than a decision.
                sub={
                  isOwnStock
                    ? "Not charged on the platform's own stock"
                    : "Platform fee, by category and tier"
                }
              />
              <StatTile
                label="You receive"
                value={formatPrice(data.earnings.netPence)}
                sub="Released after the return window"
              />
            </div>
            <p className="border-t border-border pt-3 text-xs text-fg-subtle">
              Counted from orders that have shipped. Orders still waiting to be confirmed are
              not included.
            </p>
          </section>

          {/* Recent activity */}
          <section className="flex flex-col gap-3 rounded-panel border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-base font-bold">
                <PackageCheck className="size-4 text-primary" /> Recent orders
              </h2>
              <Link
                href="/supplier/orders"
                className="focus-ring inline-flex items-center gap-1 rounded-md text-sm font-semibold text-primary hover:underline"
              >
                All orders <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {data.recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-fg-muted">
                No orders yet. They appear here as soon as one is allocated to you.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {data.recent.map((order) => (
                  <li key={order.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0">
                    <div className="min-w-0 flex-1">
                      <p className="measure truncate text-sm font-semibold">{order.reference}</p>
                      <p className="truncate text-xs text-fg-muted">
                        {order.items.map((i) => i.title).join(", ") || "—"}
                        {order.allocatedAt && ` · ${formatDate(order.allocatedAt)}`}
                      </p>
                    </div>
                    {order.shipments[0]?.trackingNumber && (
                      <span className="hidden items-center gap-1.5 text-xs text-fg-muted sm:inline-flex">
                        <Truck className="size-3.5" />
                        <span className="measure">{order.shipments[0].trackingNumber}</span>
                      </span>
                    )}
                    <span className="measure text-sm font-semibold">
                      {formatPrice(order.supplierNetPence ?? 0)}
                    </span>
                    <StatusBadge label={label(order.status)} tone={TONE[order.status] ?? "neutral"} size="sm" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Row({ label: rowLabel, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-fg-muted">{rowLabel}</dt>
      <dd>{children}</dd>
    </div>
  );
}
