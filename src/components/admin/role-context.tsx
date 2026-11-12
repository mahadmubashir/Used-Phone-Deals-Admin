"use client";

import * as React from "react";
import type { Role } from "@/shared";
import { useSession } from "@/lib/store/session";

/**
 * Which portal role the viewer is acting as.
 *
 * This now comes from the session: whoever signed in gets their own role, and
 * every endpoint re-checks it server-side, which is where access separation is
 * actually enforced. Sections are filtered through `canAccess()` from the
 * shared library, so the menu is the real permission map rather than a
 * hand-written one.
 *
 * A Super Admin can still switch role, because a Super Admin genuinely holds
 * the other roles' permissions — including a supplier's — and needs to work in
 * those views. Nobody else can, and switching would not help them if they
 * tried: the API would refuse the calls.
 */
const RoleContext = React.createContext<{
  role: Role;
  setRole: (r: Role) => void;
  /** Only a Super Admin may view the portal as another role. */
  canSwitch: boolean;
}>({ role: "SUPER_ADMIN", setRole: () => {}, canSwitch: false });

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const sessionRole = useSession((s) => s.user?.role);
  const [override, setOverride] = React.useState<Role | null>(null);

  // The signed-in role wins until a Super Admin deliberately switches.
  const role: Role = (sessionRole === "SUPER_ADMIN" ? override : null) ?? (sessionRole as Role) ?? "SUPER_ADMIN";
  const canSwitch = sessionRole === "SUPER_ADMIN";

  const value = React.useMemo(
    () => ({ role, setRole: (r: Role) => canSwitch && setOverride(r), canSwitch }),
    [role, canSwitch],
  );
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return React.useContext(RoleContext);
}
