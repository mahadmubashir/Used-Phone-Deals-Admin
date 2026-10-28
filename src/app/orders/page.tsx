"use client";

import * as React from "react";
import { DataTable, type Column } from "@/shared/components/DataTable";
import { OrderStatusBadge } from "@/shared/components/badges";
import { mockOrders } from "@/shared/mock/fixtures";
import { formatPrice, formatDate } from "@/shared/lib/format";
import { carrierLabel } from "@/shared/constants";
import type { Order } from "@/shared/types";
import { PageHead } from "@/components/admin/page-head";
import { useRole } from "@/components/admin/role-context";

export default function OrdersPage() {
  const { role } = useRole();
  const [q, setQ] = React.useState("");

  const rows = React.useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return mockOrders;
    return mockOrders.filter(
      (o) =>
        o.reference.toLowerCase().includes(n) ||
        o.buyerName.toLowerCase().includes(n) ||
        o.buyerEmail.toLowerCase().includes(n),
    );
  }, [q]);

  const columns: Column<Order>[] = [
    {
      key: "reference",
      header: "Order",
      sortValue: (r) => r.reference,
      render: (r) => (
        <div className="min-w-0">
          <p className="tnum truncate font-medium text-foreground">{r.reference}</p>
          <p className="truncate text-xs text-fg-muted">
            {r.buyerName}
            {r.isGuest && " · guest"}
          </p>
        </div>
      ),
    },
    {
      key: "placedAt",
      header: "Placed",
      hideOnMobile: true,
      sortValue: (r) => r.placedAt,
      render: (r) => <span className="text-xs text-fg-muted">{formatDate(r.placedAt)}</span>,
    },
    {
      key: "supplier",
      header: "Supplier",
      hideOnMobile: true,
      render: (r) => (
        <span className="text-xs text-fg-muted">{r.supplierName ?? "Unallocated"}</span>
      ),
    },
    {
      key: "carrier",
      header: "Carrier",
      hideOnMobile: true,
      render: (r) =>
        r.shipment?.carrier ? (
          <span className="text-xs text-fg-muted">{carrierLabel(r.shipment.carrier)}</span>
        ) : (
          <span className="text-xs text-fg-subtle">—</span>
        ),
    },
    { key: "status", header: "Status", render: (r) => <OrderStatusBadge status={r.status} size="sm" /> },
    {
      key: "totalPence",
      header: "Total",
      align: "right",
      sortValue: (r) => r.totalPence,
      render: (r) => <span className="tnum font-semibold">{formatPrice(r.totalPence)}</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead
        title={role === "CSR" ? "Order lookup" : "Orders"}
        description={
          role === "CSR"
            ? "Read-only lookup for handling buyer queries. Commission and payout data are not shown to CSR agents."
            : "Every order across the platform, with the supplier it was allocated to."
        }
      />
      <DataTable
        columns={
          role === "CSR" ? columns.filter((c) => c.key !== "supplier") : columns
        }
        rows={rows}
        rowKey={(r) => r.id}
        emptyTitle="No orders match"
        toolbar={
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search reference, buyer or email…"
            aria-label="Search orders"
            className="focus-ring w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        }
      />
    </div>
  );
}
