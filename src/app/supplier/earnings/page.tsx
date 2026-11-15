"use client";

import * as React from "react";
import { Loader2, Wallet, Clock, Info } from "lucide-react";
import { PageHead } from "@/components/admin/page-head";
import { ActingForBar, useActingSupplier } from "@/components/admin/acting-supplier";
import { StatTile } from "@/components/admin/stat-tile";
import { StatusBadge } from "@/shared/components/badges";
import { formatPrice, formatDate } from "@/shared/lib/format";
import { ApiError } from "@/lib/api/http";
import * as api from "@/lib/api/fulfilment-api";
import type { SubOrder, SupplierOverview } from "@/lib/api/fulfilment-api";

/**
 * What a seller has earned, order by order.
 *
 * Only orders that have actually shipped count. An order still waiting to be
 * confirmed is not money, and listing it as earnings would be a promise the
 * platform has not made.
 *
 * Money is held until the buyer's return window closes, so each row says when
 * that is rather than implying it is already payable.
 */

const TONE: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  SHIPPED: "info",
  DELIVERED: "success",
  COMPLETED: "success",
  REFUNDED: "danger",
};
const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, " ");

export default function EarningsPage() {
  const acting = useActingSupplier();
  const [overview, setOverview] = React.useState<SupplierOverview | null>(null);
  const [orders, setOrders] = React.useState<SubOrder[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (acting.blocked || !acting.ready) return;
    let active = true;
    setOverview(null);
    setOrders(null);

    (async () => {
      try {
        const [summary, ...lists] = await Promise.all([
          api.supplierOverview(acting.supplierId),
          api.listSubOrders({ status: "SHIPPED", supplierId: acting.supplierId, limit: 100 }),
          api.listSubOrders({ status: "DELIVERED", supplierId: acting.supplierId, limit: 100 }),
          api.listSubOrders({ status: "COMPLETED", supplierId: acting.supplierId, limit: 100 }),
        ]);
        if (!active) return;
        setOverview(summary);
        // Newest first, across all three shipped states.
        setOrders(
          lists
            .flatMap((l) => l.data)
            .sort((a, b) => (b.shippedAt ?? "").localeCompare(a.shippedAt ?? "")),
        );
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.message : "Could not load earnings.");
        setOrders([]);
      }
    })();

    return () => {
      active = false;
    };
  }, [acting.supplierId, acting.blocked, acting.ready]);

  const awaitingWindow = (orders ?? []).filter(
    (o) => o.returnWindowEndsAt && new Date(o.returnWindowEndsAt) > new Date(),
  );
  const heldPence = awaitingWindow.reduce((sum, o) => sum + (o.supplierNetPence ?? 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHead title="Earnings" description="What you have sold, and what you are owed." />

      <ActingForBar acting={acting} id="acting-for-earnings" note="Showing this supplier's earnings." />

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      {acting.blocked ? (
        <p className="rounded-panel border border-border bg-card px-5 py-10 text-center text-sm text-fg-muted">
          Choose a supplier above to see their earnings.
        </p>
      ) : !overview || !orders ? (
        <p className="flex items-center justify-center gap-2 py-12 text-sm text-fg-muted">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Sales"
              value={formatPrice(overview.earnings.grossPence)}
              sub={`${overview.earnings.ordersFulfilled} order${overview.earnings.ordersFulfilled === 1 ? "" : "s"} dispatched`}
            />
            <StatTile
              label="Commission"
              value={`− ${formatPrice(overview.earnings.commissionPence)}`}
              sub={acting.isOwnStock ? "Not charged on the platform's own stock" : "Platform fee"}
            />
            <StatTile
              label="You receive"
              value={formatPrice(overview.earnings.netPence)}
              sub="Total, across all dispatched orders"
            />
            <StatTile
              label="Held"
              value={formatPrice(heldPence)}
              sub={`${awaitingWindow.length} inside the return window`}
            />
          </div>

          <p className="flex items-start gap-2 rounded-lg border border-border bg-card px-4 py-3 text-xs text-fg-muted">
            <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
            Payment is taken from the buyer and held until their 30-day return window closes,
            then released to you. Card payments and automatic payouts are the next thing going
            live — these figures are what you have earned, not what has been paid out yet.
          </p>

          <section className="flex flex-col gap-3 rounded-panel border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-bold">
              <Wallet className="size-4 text-primary" /> Dispatched orders
            </h2>

            {orders.length === 0 ? (
              <p className="py-8 text-center text-sm text-fg-muted">
                Nothing dispatched yet. Orders appear here once you have sent them.
              </p>
            ) : (
              <div className="-mx-5 overflow-x-auto px-5">
                <table className="w-full min-w-[42rem] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-subtle">
                      <th className="pb-2 font-medium">Order</th>
                      <th className="pb-2 font-medium">Dispatched</th>
                      <th className="pb-2 text-right font-medium">Sale</th>
                      <th className="pb-2 text-right font-medium">Commission</th>
                      <th className="pb-2 text-right font-medium">You receive</th>
                      <th className="pb-2 pl-3 font-medium">Released</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((order) => {
                      const held =
                        order.returnWindowEndsAt && new Date(order.returnWindowEndsAt) > new Date();
                      return (
                        <tr key={order.id}>
                          <td className="py-2.5">
                            <p className="measure font-medium text-foreground">{order.reference}</p>
                            <p className="truncate text-xs text-fg-muted">
                              {order.items.map((i) => i.title).join(", ")}
                            </p>
                          </td>
                          <td className="py-2.5 text-xs text-fg-muted">
                            {order.shippedAt ? formatDate(order.shippedAt) : "—"}
                          </td>
                          <td className="measure py-2.5 text-right">{formatPrice(order.totalPence)}</td>
                          <td className="measure py-2.5 text-right text-fg-muted">
                            {order.commissionPence ? `− ${formatPrice(order.commissionPence)}` : "—"}
                          </td>
                          <td className="measure py-2.5 text-right font-semibold">
                            {formatPrice(order.supplierNetPence ?? 0)}
                          </td>
                          <td className="py-2.5 pl-3">
                            {held ? (
                              <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                                <Clock className="size-3" />
                                {formatDate(order.returnWindowEndsAt)}
                              </span>
                            ) : (
                              <StatusBadge label={label(order.status)} tone={TONE[order.status] ?? "neutral"} size="sm" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
