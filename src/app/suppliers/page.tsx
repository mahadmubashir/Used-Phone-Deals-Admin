"use client";

import * as React from "react";
import { DataTable, type Column } from "@/shared/components/DataTable";
import { TierBadge, StatusBadge } from "@/shared/components/badges";
import { mockSuppliers } from "@/shared/mock/fixtures";
import { formatDate } from "@/shared/lib/format";
import type { Supplier, SupplierStatus } from "@/shared/types";
import { PageHead } from "@/components/admin/page-head";

const STATUS_TONE: Record<SupplierStatus, "neutral" | "info" | "success" | "warning" | "danger"> = {
  ACTIVE: "success",
  PENDING: "warning",
  UNDER_REVIEW: "info",
  SUSPENDED: "danger",
  REJECTED: "danger",
};

const STATUS_LABEL: Record<SupplierStatus, string> = {
  ACTIVE: "Active",
  PENDING: "Pending",
  UNDER_REVIEW: "Under review",
  SUSPENDED: "Suspended",
  REJECTED: "Rejected",
};

const FILTERS = ["All", "Awaiting review", "Active", "Suspended"] as const;

export default function SuppliersPage() {
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]>("All");

  const rows = React.useMemo(() => {
    if (filter === "Awaiting review")
      return mockSuppliers.filter((s) => s.status === "PENDING" || s.status === "UNDER_REVIEW");
    if (filter === "Active") return mockSuppliers.filter((s) => s.status === "ACTIVE");
    if (filter === "Suspended")
      return mockSuppliers.filter((s) => s.status === "SUSPENDED" || s.status === "REJECTED");
    return mockSuppliers;
  }, [filter]);

  const columns: Column<Supplier>[] = [
    {
      key: "businessName",
      header: "Supplier",
      sortValue: (r) => r.businessName,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.businessName}</p>
          <p className="truncate text-xs text-fg-muted">
            {r.registeredAddress.city || r.email}
          </p>
        </div>
      ),
    },
    { key: "tier", header: "Tier", hideOnMobile: true, render: (r) => <TierBadge tier={r.tier} /> },
    {
      key: "totalStockUnits",
      header: "Units",
      align: "right",
      hideOnMobile: true,
      sortValue: (r) => r.totalStockUnits,
      render: (r) => <span className="tnum">{r.totalStockUnits}</span>,
    },
    {
      key: "fulfilmentRate",
      header: "Fulfilment",
      align: "right",
      hideOnMobile: true,
      sortValue: (r) => r.fulfilmentRate,
      render: (r) => (
        <span className={r.fulfilmentRate < 0.9 ? "tnum text-warning" : "tnum"}>
          {Math.round(r.fulfilmentRate * 100)}%
        </span>
      ),
    },
    {
      key: "kyc",
      header: "Stripe KYC",
      hideOnMobile: true,
      render: (r) => (
        <span className="text-xs text-fg-muted">
          {r.stripeConnect.kycStatus.replace("_", " ").toLowerCase()}
          {r.stripeConnect.payoutsEnabled ? " · payouts on" : ""}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (r) => (
        <StatusBadge label={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} size="sm" />
      ),
    },
    {
      key: "appliedAt",
      header: "Applied",
      align: "right",
      hideOnMobile: true,
      sortValue: (r) => r.appliedAt,
      render: (r) => <span className="text-xs text-fg-muted">{formatDate(r.appliedAt)}</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead
        title="Suppliers"
        description="Tier is derived from stock units, never set by hand. Payouts require verified Stripe Connect KYC."
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        emptyTitle="No suppliers in this state"
        toolbar={
          <div className="flex min-w-0 flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={
                  "focus-ring rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                  (filter === f
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border text-fg-muted hover:text-foreground")
                }
              >
                {f}
              </button>
            ))}
          </div>
        }
      />
    </div>
  );
}
