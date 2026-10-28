"use client";

import * as React from "react";
import { Download } from "lucide-react";
import {
  mockAdminSummary,
  mockOrders,
  mockSuppliers,
  mockCommissionRules,
} from "@/shared/mock/fixtures";
import { formatPrice, formatDate } from "@/shared/lib/format";
import { categoryLabel, SUPPLIER_TIER_MAP } from "@/shared/constants";
import { PageHead } from "@/components/admin/page-head";
import { StatTile } from "@/components/admin/stat-tile";

/** Minimal RFC-4180 escaping — quotes doubled, field wrapped when it needs it. */
function toCsv(rows: (string | number)[][]) {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const reports = [
    {
      name: "Sales report",
      description: "Every order with buyer, supplier, status and total.",
      filename: "upd-sales-report.csv",
      build: () =>
        toCsv([
          ["Reference", "Placed", "Buyer", "Guest", "Supplier", "Status", "Total (GBP)"],
          ...mockOrders.map((o) => [
            o.reference,
            o.placedAt.slice(0, 10),
            o.buyerName,
            o.isGuest ? "yes" : "no",
            o.supplierName ?? "",
            o.status,
            (o.totalPence / 100).toFixed(2),
          ]),
        ]),
    },
    {
      name: "Commission report",
      description: "Commission earned per order, and the rate card it was charged against.",
      filename: "upd-commission-report.csv",
      build: () =>
        toCsv([
          ["Reference", "Placed", "Supplier", "Order total (GBP)", "Commission (GBP)"],
          ...mockOrders.map((o) => [
            o.reference,
            o.placedAt.slice(0, 10),
            o.supplierName ?? "",
            (o.totalPence / 100).toFixed(2),
            ((o.commissionPence ?? 0) / 100).toFixed(2),
          ]),
        ]),
    },
    {
      name: "Supplier performance",
      description: "Tier, stock units, fulfilment rate and missed SLAs per supplier.",
      filename: "upd-supplier-performance.csv",
      build: () =>
        toCsv([
          ["Supplier", "Tier", "Status", "Stock units", "Fulfilment rate", "Missed SLAs", "Applied"],
          ...mockSuppliers.map((s) => [
            s.businessName,
            s.tier,
            s.status,
            s.totalStockUnits,
            `${Math.round(s.fulfilmentRate * 100)}%`,
            s.consecutiveMissedSlas,
            s.appliedAt.slice(0, 10),
          ]),
        ]),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead
        title="Reports"
        description="Exports are generated from live platform data. Figures are VAT-inclusive."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Gross · month" value={formatPrice(mockAdminSummary.grossRevenuePence.month)} />
        <StatTile label="Commission · month" value={formatPrice(mockAdminSummary.commissionPence.month)} />
        <StatTile label="Orders · week" value={String(mockAdminSummary.ordersThisWeek)} />
        <StatTile
          label="Suppliers"
          value={String(mockSuppliers.length)}
          sub={`${mockSuppliers.filter((s) => s.status === "ACTIVE").length} active`}
        />
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-3">
        {reports.map((r) => (
          <div key={r.name} className="flex flex-col rounded-card border border-border bg-card p-4">
            <h2 className="font-display text-base font-bold tracking-tight">{r.name}</h2>
            <p className="mt-1 flex-1 text-sm text-fg-muted">{r.description}</p>
            <button
              type="button"
              onClick={() => download(r.filename, r.build())}
              className="focus-ring mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <Download className="size-4" />
              Export CSV
            </button>
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-card border border-border bg-card p-4">
        <h2 className="font-display text-base font-bold tracking-tight">Commission rate card</h2>
        <p className="mt-1 text-sm text-fg-muted">
          Tiered 5–15% by category and supplier tier, per the agreement.
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-subtle">
                <th className="py-2 pr-3 font-medium">Category</th>
                {(["BRONZE", "SILVER", "GOLD", "PREMIUM"] as const).map((t) => (
                  <th key={t} className="py-2 pr-3 text-right font-medium">
                    {SUPPLIER_TIER_MAP[t].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {["mobile-phones", "tablets", "laptops", "smartwatches", "accessories"].map((cat) => (
                <tr key={cat} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3 text-foreground">
                    {categoryLabel(cat as Parameters<typeof categoryLabel>[0])}
                  </td>
                  {(["BRONZE", "SILVER", "GOLD", "PREMIUM"] as const).map((t) => {
                    const rule = mockCommissionRules.find(
                      (r) => r.category === cat && r.tier === t,
                    );
                    return (
                      <td key={t} className="tnum py-2 pr-3 text-right text-fg-muted">
                        {rule ? `${rule.ratePercent}%` : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
