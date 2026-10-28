"use client";

import * as React from "react";
import { DataTable, type Column } from "@/shared/components/DataTable";
import { CaseStatusBadge } from "@/shared/components/badges";
import { mockCases } from "@/shared/mock/fixtures";
import { formatDate } from "@/shared/lib/format";
import { CASE_TYPE_LABELS, SLA } from "@/shared/constants";
import type { CSRCase } from "@/shared/types";
import { PageHead } from "@/components/admin/page-head";

/**
 * Overdue against the contractual first-response SLA.
 *
 * `now` is passed in rather than read from the clock inside: this renders on
 * the server and again on the client, and reading Date.now() in both places
 * produced different text ("due 21 Sept" vs "Overdue"), which React rejects as
 * a hydration mismatch. The server renders nothing as breaching; the client
 * fills it in once mounted.
 */
function isBreaching(c: CSRCase, now: number | null) {
  if (now === null) return false;
  if (c.status === "RESOLVED" || c.status === "CLOSED") return false;
  return new Date(c.firstResponseDueAt).getTime() < now;
}

export default function CasesPage() {
  // null until mounted, so server and first client render agree.
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => setNow(Date.now()), []);

  const breaching = mockCases.filter((c) => isBreaching(c, now)).length;

  const columns: Column<CSRCase>[] = [
    {
      key: "reference",
      header: "Case",
      sortValue: (r) => r.reference,
      render: (r) => (
        <div className="min-w-0">
          <p className="tnum truncate font-medium text-foreground">{r.reference}</p>
          <p className="truncate text-xs text-fg-muted">{r.buyerName}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      hideOnMobile: true,
      render: (r) => <span className="text-fg-muted">{CASE_TYPE_LABELS[r.type]}</span>,
    },
    {
      key: "orderReference",
      header: "Order",
      hideOnMobile: true,
      render: (r) => <span className="tnum text-xs text-fg-muted">{r.orderReference}</span>,
    },
    {
      key: "assignedAgentName",
      header: "Agent",
      hideOnMobile: true,
      render: (r) => (
        <span className="text-xs text-fg-muted">{r.assignedAgentName ?? "Unassigned"}</span>
      ),
    },
    {
      key: "firstResponseDueAt",
      header: "First response",
      hideOnMobile: true,
      sortValue: (r) => r.firstResponseDueAt,
      render: (r) => (
        <span className={isBreaching(r, now) ? "text-xs font-medium text-destructive" : "text-xs text-fg-muted"}>
          {isBreaching(r, now) ? "Overdue" : `due ${formatDate(r.firstResponseDueAt)}`}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (r) => <CaseStatusBadge status={r.status} size="sm" />,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead
        title="Case queue"
        description={`Every buyer query routes here. Suppliers are never contacted directly — SLA is ${SLA.csrFirstResponseDays} business day to first response, ${SLA.csrResolutionDays} to resolution.`}
      />
      {breaching > 0 && (
        <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {breaching} case{breaching === 1 ? "" : "s"} past the first-response SLA.
        </p>
      )}
      <DataTable
        columns={columns}
        rows={mockCases}
        rowKey={(r) => r.id}
        emptyTitle="Queue is clear"
      />
    </div>
  );
}
