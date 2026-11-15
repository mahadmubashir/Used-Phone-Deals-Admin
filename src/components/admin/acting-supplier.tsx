"use client";

import * as React from "react";
import { useSession } from "@/lib/store/session";
import * as api from "@/lib/api/fulfilment-api";

/**
 * Which supplier the current user is working as.
 *
 * A supplier is always themselves, and this returns null — no id is sent, and
 * the API resolves them from their login. An administrator runs the platform
 * and may also sell on it, so they choose: their own selling account by
 * default, or another supplier deliberately.
 *
 * Every supplier view needs this, so it lives in one place rather than being
 * re-derived six times with six chances to get the default wrong.
 */
export function useActingSupplier() {
  const user = useSession((s) => s.user);
  const isAdmin = user?.role === "SUPER_ADMIN";

  const [suppliers, setSuppliers] = React.useState<{ id: string; businessName: string }[]>([]);
  const [ownId, setOwnId] = React.useState<string | null>(null);
  const [actingFor, setActingFor] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    if (!isAdmin) {
      setReady(true);
      return;
    }
    let active = true;
    Promise.all([api.listActiveSuppliers(), api.ownSellingAccount().catch(() => null)])
      .then(([rows, own]) => {
        if (!active) return;
        setSuppliers(rows);
        setOwnId(own?.id ?? null);
        setActingFor((current) => current ?? own?.id ?? rows[0]?.id ?? null);
      })
      .finally(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, [isAdmin]);

  return {
    isAdmin,
    /** Sent to the API. Null means "resolve me from my login". */
    supplierId: isAdmin ? actingFor : null,
    /** True while an admin has not picked anyone — nothing can be loaded yet. */
    blocked: isAdmin && !actingFor,
    /** True when the admin is looking at their own stock. */
    isOwnStock: Boolean(ownId) && actingFor === ownId,
    ready,
    suppliers,
    ownId,
    actingFor,
    setActingFor,
  };
}

/** The picker an admin uses to choose whose queue they are in. Renders
 *  nothing for a supplier, who has no one else to be. */
export function ActingForBar({
  acting,
  id = "acting-for",
  note,
}: {
  acting: ReturnType<typeof useActingSupplier>;
  id?: string;
  note?: string;
}) {
  if (!acting.isAdmin) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-panel border border-border bg-card px-4 py-3">
      <label htmlFor={id} className="text-xs font-semibold text-fg-muted">
        Acting for supplier
      </label>
      <select
        id={id}
        value={acting.actingFor ?? ""}
        onChange={(e) => acting.setActingFor(e.target.value || null)}
        className="h-9 min-w-56 rounded-lg border border-border bg-surface px-3 text-sm"
      >
        <option value="">Choose a supplier…</option>
        {acting.suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.businessName}
            {s.id === acting.ownId ? " — your own stock" : ""}
          </option>
        ))}
      </select>
      <p className="text-xs text-fg-subtle">
        {note ??
          "Admins hold supplier permissions, so every action here is recorded against you on that supplier's behalf."}
      </p>
    </div>
  );
}
