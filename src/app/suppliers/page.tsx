"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { DataTable, type Column } from "@/shared/components/DataTable";
import { TierBadge, StatusBadge } from "@/shared/components/badges";
import { formatDate } from "@/shared/lib/format";
import { PageHead } from "@/components/admin/page-head";
import * as api from "@/lib/auth/admin-api";
import type { Supplier } from "@/lib/auth/admin-api";
import { ApiError } from "@/lib/api/http";

const FILTERS = ["ALL", "PENDING", "UNDER_REVIEW", "ACTIVE", "SUSPENDED", "REJECTED"] as const;

const TONE: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
  ACTIVE: "success",
  PENDING: "warning",
  UNDER_REVIEW: "info",
  SUSPENDED: "danger",
  REJECTED: "danger",
};

/** "UNDER_REVIEW" -> "Under review". Built for the API's uppercase enums. */
const label = (s: string) =>
  s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, " ");

/** Action buttons say what they do, in the interface's own voice. */
const ACTION_LABEL: Record<string, string> = {
  "start-review": "Start review",
  approve: "Approve",
  reject: "Reject",
  suspend: "Suspend",
  reinstate: "Reinstate",
};

/** Which transitions the API allows from each state. */
function actionsFor(status: string) {
  if (status === "PENDING") return ["start-review", "approve", "reject"] as const;
  if (status === "UNDER_REVIEW") return ["approve", "reject"] as const;
  if (status === "ACTIVE") return ["suspend"] as const;
  if (status === "SUSPENDED") return ["reinstate"] as const;
  return [] as const;
}

export default function SuppliersPage() {
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]>("ALL");
  const [rows, setRows] = React.useState<Supplier[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [working, setWorking] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await api.listSuppliers(filter));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load suppliers.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, action: Parameters<typeof api.actOnSupplier>[1]) {
    setWorking(`${id}:${action}`);
    try {
      // Rejection and suspension are recorded with a reason, which the audit
      // trail keeps against the acting agent.
      const reason =
        action === "reject" || action === "suspend"
          ? window.prompt(`Reason for ${action}?`) ?? undefined
          : undefined;
      if ((action === "reject" || action === "suspend") && !reason) return;
      await api.actOnSupplier(id, action, reason);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That action failed.");
    } finally {
      setWorking(null);
    }
  }

  const columns: Column<Supplier>[] = [
    {
      key: "businessName",
      header: "Supplier",
      sortValue: (r) => r.businessName,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{r.businessName}</p>
          <p className="truncate text-xs text-fg-muted">{r.email}</p>
        </div>
      ),
    },
    { key: "tier", header: "Tier", hideOnMobile: true, render: (r) => <TierBadge tier={r.tier as never} /> },
    {
      key: "units",
      header: "Units",
      align: "right",
      hideOnMobile: true,
      render: (r) => <span className="measure">{r.totalStockUnits ?? 0}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge label={label(r.status)} tone={TONE[r.status] ?? "neutral"} size="sm" />,
    },
    {
      key: "appliedAt",
      header: "Applied",
      align: "right",
      hideOnMobile: true,
      render: (r) => <span className="text-xs text-fg-muted">{r.appliedAt ? formatDate(r.appliedAt) : "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-1.5">
          {actionsFor(r.status).map((a) => (
            <button
              key={a}
              onClick={() => act(r.id, a)}
              disabled={working !== null}
              className="focus-ring rounded-full border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:border-border-strong disabled:opacity-50"
            >
              {working === `${r.id}:${a}` ? "…" : ACTION_LABEL[a]}
            </button>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead
        title="Suppliers"
        description="Applications and accounts, live from the platform. Tier is derived from stock units; payouts require verified KYC."
      />

      {error && (
        <p role="alert" className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        loading={loading}
        emptyTitle="No suppliers in this state"
        toolbar={
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={
                  "focus-ring rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                  (filter === f
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border text-fg-muted hover:text-foreground")
                }
              >
                {f === "ALL" ? "All" : label(f)}
              </button>
            ))}
            {loading && <Loader2 className="size-4 animate-spin text-fg-subtle" />}
          </div>
        }
      />
    </div>
  );
}
