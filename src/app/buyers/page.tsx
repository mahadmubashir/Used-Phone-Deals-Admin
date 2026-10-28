"use client";

import { DataTable, type Column } from "@/shared/components/DataTable";
import { StatusBadge } from "@/shared/components/badges";
import { mockBuyers } from "@/shared/mock/fixtures";
import { formatPrice, formatDate } from "@/shared/lib/format";
import type { Buyer } from "@/shared/types";
import { PageHead } from "@/components/admin/page-head";

export default function BuyersPage() {
  const columns: Column<Buyer>[] = [
    {
      key: "name",
      header: "Buyer",
      sortValue: (r) => `${r.firstName} ${r.lastName}`,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {r.firstName} {r.lastName}
          </p>
          <p className="truncate text-xs text-fg-muted">{r.email}</p>
        </div>
      ),
    },
    {
      key: "orderCount",
      header: "Orders",
      align: "right",
      sortValue: (r) => r.orderCount,
      render: (r) => <span className="tnum">{r.orderCount}</span>,
    },
    {
      key: "totalSpentPence",
      header: "Lifetime spend",
      align: "right",
      sortValue: (r) => r.totalSpentPence,
      render: (r) => <span className="tnum font-semibold">{formatPrice(r.totalSpentPence)}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      hideOnMobile: true,
      render: (r) => (
        <StatusBadge
          label={r.status === "ACTIVE" ? "Active" : "Suspended"}
          tone={r.status === "ACTIVE" ? "success" : "danger"}
          size="sm"
        />
      ),
    },
    {
      key: "registeredAt",
      header: "Registered",
      align: "right",
      hideOnMobile: true,
      sortValue: (r) => r.registeredAt,
      render: (r) => <span className="text-xs text-fg-muted">{formatDate(r.registeredAt)}</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead
        title="Buyers"
        description="Registered accounts. Guest orders are tracked against the order itself, not a buyer record."
      />
      <DataTable columns={columns} rows={mockBuyers} rowKey={(r) => r.id} emptyTitle="No buyers yet" />
    </div>
  );
}
