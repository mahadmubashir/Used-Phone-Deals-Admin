"use client";

import * as React from "react";
import {
  Loader2,
  MapPin,
  PackageCheck,
  PackageX,
  Truck,
  AlertTriangle,
  Smartphone,
  Clock,
} from "lucide-react";
import { ConditionBadge, StatusBadge } from "@/shared/components/badges";
import { formatPrice, formatDate, formatDateTime } from "@/shared/lib/format";
import { PageHead } from "@/components/admin/page-head";
import { ActingForBar, useActingSupplier } from "@/components/admin/acting-supplier";
import { ApiError } from "@/lib/api/http";
import * as api from "@/lib/api/fulfilment-api";
import type { SubOrder, SubOrderStatus, FulfilmentCounts } from "@/lib/api/fulfilment-api";

/**
 * The supplier's fulfilment queue.
 *
 * An order allocated to a supplier lands here. They confirm it, pick the exact
 * devices by IMEI or serial, dispatch with a carrier from the approved list,
 * and the parcel is tracked from there. Rejecting hands the order to the
 * next-best supplier automatically and costs this one their fulfilment rate,
 * which feeds the next allocation they are considered for.
 *
 * A Super Admin holds supplier permissions too, so they pick which supplier
 * they are acting for; a supplier only ever sees their own queue, enforced by
 * the API rather than by this page.
 */

const TABS: { key: SubOrderStatus | "ALL"; label: string; countKey?: keyof FulfilmentCounts }[] = [
  { key: "PLACED", label: "To confirm", countKey: "awaitingConfirmation" },
  { key: "CONFIRMED", label: "To dispatch", countKey: "toDispatch" },
  { key: "SHIPPED", label: "In transit", countKey: "inTransit" },
  { key: "DELIVERED", label: "Delivered", countKey: "delivered" },
  { key: "CANCELLED", label: "Cancelled", countKey: "cancelled" },
  { key: "ALL", label: "All" },
];

const TONE: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  PLACED: "warning",
  CONFIRMED: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  COMPLETED: "success",
  CANCELLED: "danger",
  REFUNDED: "danger",
};

const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, " ");

export default function SupplierOrdersPage() {
  const acting = useActingSupplier();

  const [tab, setTab] = React.useState<SubOrderStatus | "ALL">("PLACED");
  const [orders, setOrders] = React.useState<SubOrder[]>([]);
  const [counts, setCounts] = React.useState<FulfilmentCounts | null>(null);
  const [carriers, setCarriers] = React.useState<{ code: string; label: string }[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  // An admin has no supplier of their own, so the first active supplier is
  // selected to give the page something to show.
  React.useEffect(() => {
    api.listCarriers().then(setCarriers).catch(() => setCarriers([]));
  }, []);


  const load = React.useCallback(async () => {
    if (acting.blocked) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [list, summary] = await Promise.all([
        api.listSubOrders({ status: tab === "ALL" ? undefined : tab, supplierId: acting.supplierId }),
        api.fulfilmentCounts(acting.supplierId),
      ]);
      setOrders(list.data);
      setCounts(summary);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [tab, acting.supplierId, acting.blocked]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const act = React.useCallback(
    async (run: () => Promise<string | null>) => {
      setError(null);
      setNotice(null);
      try {
        const message = await run();
        if (message) setNotice(message);
        await load();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "That action failed.");
      }
    },
    [load],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHead
        title="Orders"
        description="Orders allocated to you: confirm, pick the devices, and dispatch with a tracked carrier."
      />

      <ActingForBar acting={acting} id="acting-for" />

      {counts && counts.overdueConfirmations > 0 && (
        <p className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm font-medium text-warning">
          <AlertTriangle className="size-4 shrink-0" />
          {counts.overdueConfirmations} order
          {counts.overdueConfirmations === 1 ? " is" : "s are"} past the confirmation
          deadline. Repeatedly missing it takes a supplier out of allocation.
        </p>
      )}

      {/* Status tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => {
          const count = t.countKey && counts ? counts[t.countKey] : null;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={active ? "true" : undefined}
              className={
                "focus-ring inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors " +
                (active
                  ? "bg-primary text-primary-foreground"
                  : "border border-border text-fg-muted hover:bg-surface-inset")
              }
            >
              {t.label}
              {count !== null && count > 0 && (
                <span
                  className={
                    "measure rounded-full px-1.5 text-xs " +
                    (active ? "bg-primary-foreground/20" : "bg-surface-inset")
                  }
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm font-medium text-success">
          {notice}
        </p>
      )}

      {acting.blocked ? (
        <p className="rounded-panel border border-border bg-card px-5 py-10 text-center text-sm text-fg-muted">
          Choose a supplier above to see their orders.
        </p>
      ) : loading ? (
        <p className="flex items-center justify-center gap-2 py-12 text-sm text-fg-muted">
          <Loader2 className="size-4 animate-spin" /> Loading orders…
        </p>
      ) : orders.length === 0 ? (
        <p className="rounded-panel border border-border bg-card px-5 py-10 text-center text-sm text-fg-muted">
          Nothing here. {tab === "PLACED" ? "No orders are waiting to be confirmed." : "Try another tab."}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              carriers={carriers}
              supplierId={acting.supplierId}
              onAct={act}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  carriers,
  supplierId,
  onAct,
}: {
  order: SubOrder;
  carriers: { code: string; label: string }[];
  supplierId: string | null;
  onAct: (run: () => Promise<string | null>) => Promise<void>;
}) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [showShip, setShowShip] = React.useState(false);
  const [carrierCode, setCarrierCode] = React.useState("");
  const [trackingNumber, setTrackingNumber] = React.useState("");

  const run = async (key: string, fn: () => Promise<string | null>) => {
    setBusy(key);
    try {
      await onAct(fn);
    } finally {
      setBusy(null);
    }
  };

  const units = order.items.flatMap((i) => i.units);
  const shipment = order.shipments.find((s) => s.status !== "CANCELLED");

  return (
    <article className="overflow-hidden rounded-panel border border-border bg-card">
      {/* Header */}
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <p className="measure truncate text-sm font-semibold text-foreground">
            {order.reference}
          </p>
          <p className="truncate text-xs text-fg-muted">
            Order {order.orderReference}
            {order.placedAt && ` · placed ${formatDate(order.placedAt)}`}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {order.status === "PLACED" && order.confirmationDueAt && (
            <span
              className={
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold " +
                (order.isOverdue ? "bg-destructive/10 text-destructive" : "bg-surface-inset text-fg-muted")
              }
            >
              <Clock className="size-3" />
              {order.isOverdue ? "Overdue" : `Confirm by ${formatDate(order.confirmationDueAt)}`}
            </span>
          )}
          <StatusBadge label={label(order.status)} tone={TONE[order.status] ?? "neutral"} size="sm" />
        </div>
      </header>

      <div className="grid gap-5 px-5 py-4 lg:grid-cols-[1fr_17rem]">
        {/* Items and the devices to pick */}
        <div className="flex min-w-0 flex-col gap-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                  {item.title}
                </p>
                <ConditionBadge grade={item.conditionGrade as never} size="sm" />
                <span className="text-xs text-fg-muted">× {item.quantity}</span>
                <span className="measure text-sm font-semibold">
                  {formatPrice(item.lineTotalPence)}
                </span>
              </div>
              {item.units.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {item.units.map((unit) => (
                    <li
                      key={unit.id}
                      className="inline-flex items-center gap-1.5 rounded-md bg-surface-inset px-2 py-1 text-xs"
                    >
                      <Smartphone className="size-3 text-fg-subtle" />
                      <span className="measure">{unit.imei ?? unit.serialNumber}</span>
                      {unit.batteryHealthPercent != null && (
                        <span className="text-fg-subtle">· {unit.batteryHealthPercent}%</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {units.length > 0 && (
            <p className="text-xs text-fg-subtle">
              {units.length === 1
                ? "Pick this exact device"
                : `Pick these exact ${units.length} devices`}{" "}
              — the stock ledger and the parcel have to agree.
            </p>
          )}

          {shipment && (
            <p className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-fg-muted">
              <Truck className="size-3.5 shrink-0 text-primary" />
              {shipment.carrierLabel}
              {shipment.trackingNumber && (
                <span className="measure text-foreground">{shipment.trackingNumber}</span>
              )}
              {shipment.shippedAt && <span>· dispatched {formatDateTime(shipment.shippedAt)}</span>}
            </p>
          )}

          {order.status === "CANCELLED" && order.cancellationReason && (
            <p className="text-xs text-destructive">Cancelled: {order.cancellationReason}</p>
          )}
        </div>

        {/* Address, money, actions */}
        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
              <MapPin className="size-3.5" /> Deliver to
            </h3>
            <address className="text-sm not-italic text-fg-muted">
              {order.deliverTo.fullName}
              <br />
              {order.deliverTo.line1}
              <br />
              {order.deliverTo.line2 && (
                <>
                  {order.deliverTo.line2}
                  <br />
                </>
              )}
              {order.deliverTo.city}
              <br />
              <span className="measure">{order.deliverTo.postcode}</span>
            </address>
          </div>

          <dl className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
            <Row label="Sale" value={formatPrice(order.subtotalPence)} />
            {order.shippingPence > 0 && (
              <Row label="Delivery" value={formatPrice(order.shippingPence)} />
            )}
            <Row label="Commission" value={`− ${formatPrice(order.commissionPence ?? 0)}`} />
            <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
              <dt className="text-xs font-semibold text-foreground">You receive</dt>
              <dd className="measure font-semibold text-foreground">
                {formatPrice(order.supplierNetPence ?? 0)}
              </dd>
            </div>
          </dl>

          {/* Actions follow the status; the API refuses anything else anyway. */}
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            {order.status === "PLACED" && (
              <>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    run("confirm", async () => {
                      await api.confirmSubOrder(order.id, supplierId);
                      return `${order.reference} confirmed.`;
                    })
                  }
                  className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
                >
                  {busy === "confirm" ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
                  Confirm order
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    run("reject", async () => {
                      const reason = window.prompt(
                        "Why can you not fulfil this order? It will be offered to the next-best supplier.",
                      );
                      if (!reason || reason.trim().length < 5) return null;
                      const result = await api.rejectSubOrder(order.id, reason.trim(), supplierId);
                      return result.reallocated
                        ? `${order.reference} passed to another supplier.`
                        : `${order.reference} cancelled — no other supplier could fulfil it.`;
                    })
                  }
                  className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-destructive/40 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60"
                >
                  {busy === "reject" ? <Loader2 className="size-4 animate-spin" /> : <PackageX className="size-4" />}
                  Can&apos;t fulfil
                </button>
              </>
            )}

            {order.status === "CONFIRMED" && !showShip && (
              <button
                type="button"
                onClick={() => setShowShip(true)}
                className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
              >
                <Truck className="size-4" /> Dispatch
              </button>
            )}

            {order.status === "CONFIRMED" && showShip && (
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run("ship", async () => {
                    await api.shipSubOrder(
                      order.id,
                      { carrierCode, trackingNumber: trackingNumber.trim() },
                      supplierId,
                    );
                    setShowShip(false);
                    return `${order.reference} dispatched.`;
                  });
                }}
              >
                <label className="text-xs font-semibold text-fg-muted" htmlFor={`carrier-${order.id}`}>
                  Carrier
                </label>
                <select
                  id={`carrier-${order.id}`}
                  required
                  value={carrierCode}
                  onChange={(e) => setCarrierCode(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-surface px-2 text-sm"
                >
                  <option value="">Choose a carrier…</option>
                  {carriers.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <label className="text-xs font-semibold text-fg-muted" htmlFor={`tracking-${order.id}`}>
                  Tracking number
                </label>
                <input
                  id={`tracking-${order.id}`}
                  required
                  minLength={4}
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. AB123456789GB"
                  className="h-9 rounded-lg border border-border bg-surface px-2.5 text-sm"
                />
                <p className="text-xs text-fg-subtle">
                  Only carriers offering tracking with signature on delivery are listed.
                </p>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={busy !== null}
                    className="focus-ring inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
                  >
                    {busy === "ship" ? <Loader2 className="size-4 animate-spin" /> : <Truck className="size-4" />}
                    Confirm dispatch
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowShip(false)}
                    className="focus-ring rounded-full border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface-inset"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {order.status === "SHIPPED" && (
              <>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() =>
                    run("delivered", async () => {
                      await api.markSubOrderDelivered(order.id, supplierId);
                      return `${order.reference} marked delivered — the 30-day return window starts now.`;
                    })
                  }
                  className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold hover:bg-surface-inset disabled:opacity-60"
                >
                  {busy === "delivered" ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
                  Mark delivered
                </button>
                <p className="text-xs text-fg-subtle">
                  Normally set automatically by the carrier. Use this when a webhook is late.
                </p>
              </>
            )}

            {order.status === "DELIVERED" && order.returnWindowEndsAt && (
              <p className="text-xs text-fg-subtle">
                Return window closes {formatDate(order.returnWindowEndsAt)}. Payment is
                released after that.
              </p>
            )}

            {order.allocation && (
              <p className="text-xs text-fg-subtle">
                Allocated on a score of {order.allocation.score.toFixed(2)}
                {order.allocation.distanceKm != null &&
                  ` · ${Math.round(order.allocation.distanceKm)} km away`}
                {order.allocation.attempt > 1 && ` · attempt ${order.allocation.attempt}`}
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function Row({ label: rowLabel, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-xs text-fg-muted">{rowLabel}</dt>
      <dd className="measure text-sm text-foreground">{value}</dd>
    </div>
  );
}
