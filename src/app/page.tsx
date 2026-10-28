import Link from "next/link";
import { ArrowRight, AlertTriangle, Store, LifeBuoy } from "lucide-react";
import { mockAdminSummary, mockOrders, mockSuppliers, mockCases } from "@/shared/mock/fixtures";
import { formatPrice, formatDate } from "@/shared/lib/format";
import { ORDER_STATUS_LABELS } from "@/shared/constants";
import { StatTile } from "@/components/admin/stat-tile";
import { TrendChart } from "@/components/admin/trend-chart";

export const metadata = { title: "Dashboard" };

const S = mockAdminSummary;

export default function AdminDashboard() {
  const revenue = S.revenueSeries.map((d) => ({ date: d.date, value: d.grossPence }));
  const commission = S.revenueSeries.map((d) => ({ date: d.date, value: d.commissionPence }));

  const pendingSuppliers = mockSuppliers.filter((s) => s.status === "PENDING" || s.status === "UNDER_REVIEW");
  const openCases = mockCases.filter((c) => c.status !== "RESOLVED" && c.status !== "CLOSED");
  const recentOrders = [...mockOrders]
    .sort((a, b) => +new Date(b.placedAt) - +new Date(a.placedAt))
    .slice(0, 6);

  const queues = [
    {
      label: "Supplier applications awaiting review",
      count: S.pendingSupplierApprovals,
      href: "/suppliers",
      Icon: Store,
    },
    {
      label: "Open customer service cases",
      count: S.openCsrCases,
      href: "/cases",
      Icon: LifeBuoy,
    },
    {
      label: "Shipment exceptions flagged",
      count: S.flaggedShipments,
      href: "/orders",
      Icon: AlertTriangle,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Platform-wide trading position. Figures are gross and VAT-inclusive.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Gross revenue"
          value={formatPrice(S.grossRevenuePence.today)}
          sub={`${formatPrice(S.grossRevenuePence.week)} this week`}
        />
        <StatTile
          label="Commission"
          value={formatPrice(S.commissionPence.today)}
          sub={`${formatPrice(S.commissionPence.month)} this month`}
        />
        <StatTile
          label="Orders today"
          value={String(S.ordersToday)}
          sub={`${S.ordersThisWeek} this week`}
        />
        <StatTile
          label="Active listings"
          value={String(S.activeListings)}
          sub="Published in catalogue"
        />
      </section>

      {/* Two small multiples rather than one dual-axis chart: commission is
          roughly a tenth of gross, so a shared scale would flatten it and a
          second axis would invite false crossings. */}
      <section className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-4">
          <TrendChart
            points={revenue}
            colorVar="var(--chart-revenue)"
            label="Gross revenue · 30 days"
          />
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <TrendChart
            points={commission}
            colorVar="var(--chart-commission)"
            label="Commission earned · 30 days"
          />
        </div>
      </section>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.35fr]">
        <section className="rounded-card border border-border bg-card p-4">
          <h2 className="font-display text-base font-bold tracking-tight">
            Needs attention
          </h2>
          <ul className="mt-3 flex flex-col gap-1">
            {queues.map((q) => (
              <li key={q.label}>
                <Link
                  href={q.href}
                  className="focus-ring group flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-inset"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-inset text-fg-muted">
                    <q.Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-foreground">{q.label}</span>
                  <span className="tnum text-sm font-bold text-foreground">{q.count}</span>
                  <ArrowRight className="size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>

          {pendingSuppliers.length > 0 && (
            <p className="mt-3 border-t border-border pt-3 text-xs text-fg-muted">
              Oldest application:{" "}
              <span className="font-medium text-foreground">
                {pendingSuppliers[0].businessName}
              </span>{" "}
              · submitted {formatDate(pendingSuppliers[0].appliedAt)}
            </p>
          )}
        </section>

        <section className="min-w-0 rounded-card border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-bold tracking-tight">
              Latest orders
            </h2>
            <Link
              href="/orders"
              className="focus-ring rounded-md text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-border">
            {recentOrders.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="tnum truncate text-sm font-medium text-foreground">
                    {o.reference}
                  </p>
                  <p className="truncate text-xs text-fg-muted">
                    {o.buyerName}
                    {o.isGuest && " · guest"}
                  </p>
                </div>
                <span className="hidden text-xs text-fg-muted sm:block">
                  {ORDER_STATUS_LABELS[o.status]}
                </span>
                <span className="tnum text-sm font-semibold text-foreground">
                  {formatPrice(o.totalPence)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-border pt-3 text-xs text-fg-muted">
            {openCases.length} case{openCases.length === 1 ? "" : "s"} currently open with
            customer service.
          </p>
        </section>
      </div>
    </div>
  );
}
