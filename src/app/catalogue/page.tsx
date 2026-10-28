"use client";

import * as React from "react";
import { DataTable, type Column } from "@/shared/components/DataTable";
import { ConditionBadge, StockBadge } from "@/shared/components/badges";
import { mockListings } from "@/shared/mock/fixtures";
import { formatPrice } from "@/shared/lib/format";
import { categoryLabel } from "@/shared/constants";
import type { CatalogueListing } from "@/shared/types";
import { PageHead } from "@/components/admin/page-head";

/**
 * Admin owns the catalogue outright: suppliers submit stock against these
 * entries but never create or price them, so every control here is an admin
 * control and none of it is supplier-editable.
 */
export default function CataloguePage() {
  const [q, setQ] = React.useState("");

  const rows = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return mockListings;
    return mockListings.filter(
      (l) =>
        l.title.toLowerCase().includes(needle) ||
        l.brand.toLowerCase().includes(needle),
    );
  }, [q]);

  const columns: Column<CatalogueListing>[] = [
    {
      key: "title",
      header: "Listing",
      sortValue: (r) => r.title,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.title}</p>
          <p className="truncate text-xs text-fg-muted">{r.brand}</p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      hideOnMobile: true,
      sortValue: (r) => r.category,
      render: (r) => <span className="text-fg-muted">{categoryLabel(r.category)}</span>,
    },
    {
      key: "grade",
      header: "Best grade",
      hideOnMobile: true,
      render: (r) =>
        r.bestAvailableGrade ? (
          <ConditionBadge grade={r.bestAvailableGrade} size="sm" />
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      key: "totalStock",
      header: "Stock",
      align: "right",
      sortValue: (r) => r.totalStock,
      render: (r) => <span className="tnum">{r.totalStock}</span>,
    },
    {
      key: "pricePence",
      header: "Price",
      align: "right",
      sortValue: (r) => r.pricePence,
      render: (r) => <span className="tnum font-semibold">{formatPrice(r.pricePence)}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (r) => <StockBadge inStock={r.inStock} />,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead
        title="Catalogue"
        description={`${mockListings.length} master listings. Admin sets title, photography, price and VAT scheme.`}
      />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        emptyTitle="No listings match"
        emptyDescription="Try a different product or brand name."
        toolbar={
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search listings…"
            aria-label="Search listings"
            className="focus-ring w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        }
      />
    </div>
  );
}
