"use client";

import * as React from "react";
import type { Role } from "@/shared";

/**
 * Which portal role the viewer is acting as.
 *
 * In production this comes from the session and is enforced server-side — the
 * contract requires access separation, not a UI illusion. Here it is switchable
 * so the navigation and route guards can be demonstrated without a backend:
 * every section is filtered through `canAccess()` from the shared library, so
 * what you see is the real permission map, not a hand-written menu.
 */
const RoleContext = React.createContext<{
  role: Role;
  setRole: (r: Role) => void;
}>({ role: "SUPER_ADMIN", setRole: () => {} });

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = React.useState<Role>("SUPER_ADMIN");
  const value = React.useMemo(() => ({ role, setRole }), [role]);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole() {
  return React.useContext(RoleContext);
}
