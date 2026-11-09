/**
 * Staff authentication and the Module 2 supplier workflow.
 *
 * Suppliers and staff both sign in here; the API decides what each may do.
 * A supplier's password alone never yields a session — MFA is mandatory for
 * them, which is why login can return a challenge instead of a token.
 */
import { apiFetch, tokens } from "@/lib/api/http";

export type StaffRole = "SUPPLIER" | "CSR" | "SUPER_ADMIN";

export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: StaffRole;
  status: string;
  mfaEnabled: boolean;
}

export interface LoginResult {
  user?: StaffUser;
  /** Present when the account must clear MFA before it gets a session. */
  mfaRequired?: boolean;
  mfaEnrolled?: boolean;
  challengeToken?: string;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await apiFetch<LoginResult & { accessToken?: string; refreshToken?: string }>(
    "/auth/admin/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
  if (res.accessToken) tokens.set(res.accessToken, res.refreshToken ?? null);
  return res;
}

/** Starts MFA enrolment, returning the secret to show as a QR code. */
export async function mfaSetup(challengeToken: string) {
  return apiFetch<{ secret?: string; otpauthUrl?: string }>("/auth/admin/mfa/setup", {
    method: "POST",
    body: JSON.stringify({ challengeToken }),
  });
}

export async function mfaVerify(challengeToken: string, code: string): Promise<StaffUser> {
  const res = await apiFetch<{ user: StaffUser; accessToken: string; refreshToken?: string }>(
    "/auth/admin/mfa/verify",
    { method: "POST", body: JSON.stringify({ challengeToken, code }) },
  );
  tokens.set(res.accessToken, res.refreshToken ?? null);
  return res.user;
}

export async function me(): Promise<StaffUser | null> {
  if (!tokens.access) return null;
  try {
    const res = await apiFetch<{ user: StaffUser }>("/auth/me", { auth: true });
    return res.user;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  const refreshToken = tokens.refresh;
  try {
    if (refreshToken) {
      await apiFetch("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) });
    }
  } finally {
    tokens.clear();
  }
}

/* ----------------------------- Module 2 ----------------------------- */

export interface Supplier {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  status: string;
  tier: string;
  vatNumber?: string | null;
  companiesHouseNumber?: string | null;
  totalStockUnits?: number;
  fulfilmentRate?: number | string;
  appliedAt?: string;
  approvedAt?: string | null;
  address?: { line1?: string; city?: string; postcode?: string } | null;
}

export async function listSuppliers(status?: string) {
  const qs = status && status !== "ALL" ? `?status=${encodeURIComponent(status)}` : "";
  const res = await apiFetch<{ data?: Supplier[]; suppliers?: Supplier[] } | Supplier[]>(
    `/suppliers${qs}`,
    { auth: true },
  );
  // The endpoint has been seen to return either a bare array or a wrapper;
  // normalise once here rather than at every call site.
  if (Array.isArray(res)) return res;
  return res.data ?? res.suppliers ?? [];
}

type SupplierAction = "start-review" | "approve" | "reject" | "suspend" | "reinstate";

export async function actOnSupplier(id: string, action: SupplierAction, reason?: string) {
  return apiFetch<{ supplier?: Supplier }>(`/suppliers/${id}/${action}`, {
    method: "POST",
    auth: true,
    ...(reason ? { body: JSON.stringify({ reason }) } : {}),
  });
}
