/**
 * Supplier fulfilment, against the platform API.
 *
 * A supplier acts as themselves. A Super Admin holds supplier permissions too
 * and acts for a named supplier, which is why every call takes an optional
 * supplierId — the API refuses an admin call that does not say who it is for,
 * rather than guessing.
 */
import { apiFetch, API_BASE } from "./http";

export type SubOrderStatus =
  | "AWAITING_ALLOCATION"
  | "PLACED"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

/** One physical device, by the identifier the supplier picks it with. */
export interface SubOrderUnit {
  id: string;
  imei: string | null;
  serialNumber: string | null;
  batteryHealthPercent: number | null;
  status: string;
}

export interface SubOrderItem {
  id: string;
  title: string;
  brand: string | null;
  model: string | null;
  category: string | null;
  conditionGrade: "PREMIUM" | "EXCELLENT" | "GOOD" | "FAIR";
  quantity: number;
  unitPricePence: number;
  lineTotalPence: number;
  commissionPence: number | null;
  units: SubOrderUnit[];
}

export interface SubOrder {
  id: string;
  reference: string;
  orderReference: string;
  status: SubOrderStatus;
  placedAt: string | null;
  allocatedAt: string | null;
  confirmationDueAt: string | null;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  returnWindowEndsAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  subtotalPence: number;
  shippingPence: number;
  totalPence: number;
  commissionPence: number | null;
  supplierNetPence: number | null;
  isOverdue: boolean;
  allocation: { attempt: number; score: number; distanceKm: number | null } | null;
  deliverTo: {
    fullName: string;
    line1: string;
    line2: string | null;
    city: string;
    county: string | null;
    postcode: string;
    country: string;
  };
  items: SubOrderItem[];
  shipments: {
    id: string;
    carrierCode: string;
    carrierLabel: string;
    trackingNumber: string | null;
    status: string;
    shippedAt: string | null;
    deliveredAt: string | null;
  }[];
}

export interface FulfilmentCounts {
  awaitingConfirmation: number;
  toDispatch: number;
  inTransit: number;
  delivered: number;
  completed: number;
  cancelled: number;
  overdueConfirmations: number;
}

/** Admins must say which supplier they are acting for; suppliers must not. */
const acting = (supplierId?: string | null) =>
  supplierId ? `supplierId=${encodeURIComponent(supplierId)}` : "";

const withActing = (path: string, supplierId?: string | null) => {
  const q = acting(supplierId);
  if (!q) return path;
  return `${path}${path.includes("?") ? "&" : "?"}${q}`;
};

export async function listSubOrders(options: {
  status?: SubOrderStatus;
  supplierId?: string | null;
  page?: number;
  limit?: number;
} = {}) {
  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);
  params.set("page", String(options.page ?? 1));
  params.set("limit", String(options.limit ?? 50));
  return apiFetch<{ data: SubOrder[]; total: number; page: number; limit: number }>(
    withActing(`/supplier/orders?${params.toString()}`, options.supplierId),
    { auth: true },
  );
}

/** Everything the supplier home screen shows, in one call. */
export interface SupplierOverview {
  supplier: {
    businessName: string | null;
    tier: "BRONZE" | "SILVER" | "GOLD" | "PREMIUM" | null;
    fulfilmentRate: number;
    consecutiveMissedSlas: number;
  };
  counts: FulfilmentCounts;
  stock: { availableUnits: number; listings: number; totalStockUnits: number };
  earnings: {
    ordersFulfilled: number;
    grossPence: number;
    commissionPence: number;
    netPence: number;
  };
  recent: SubOrder[];
}

export async function supplierOverview(supplierId?: string | null) {
  return apiFetch<SupplierOverview>(withActing("/supplier/overview", supplierId), { auth: true });
}

export async function fulfilmentCounts(supplierId?: string | null) {
  const { counts } = await apiFetch<{ counts: FulfilmentCounts }>(
    withActing("/supplier/orders/summary", supplierId),
    { auth: true },
  );
  return counts;
}

export async function confirmSubOrder(id: string, supplierId?: string | null) {
  const { order } = await apiFetch<{ order: SubOrder }>(`/supplier/orders/${id}/confirm`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(supplierId ? { supplierId } : {}),
  });
  return order;
}

export async function rejectSubOrder(id: string, reason: string, supplierId?: string | null) {
  return apiFetch<{ status: SubOrderStatus; reallocated: boolean }>(
    `/supplier/orders/${id}/reject`,
    {
      method: "POST",
      auth: true,
      body: JSON.stringify({ reason, ...(supplierId ? { supplierId } : {}) }),
    },
  );
}

export async function shipSubOrder(
  id: string,
  input: { carrierCode: string; trackingNumber: string; trackingUrl?: string },
  supplierId?: string | null,
) {
  const { order } = await apiFetch<{ order: SubOrder }>(`/supplier/orders/${id}/ship`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ ...input, ...(supplierId ? { supplierId } : {}) }),
  });
  return order;
}

export async function markSubOrderDelivered(id: string, supplierId?: string | null) {
  const { order } = await apiFetch<{ order: SubOrder }>(`/supplier/orders/${id}/delivered`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(supplierId ? { supplierId } : {}),
  });
  return order;
}

/** The approved carrier list. The API only returns carriers that are active
 *  and offer tracking with signature, so the dropdown cannot offer a choice
 *  that would then be refused. */
export async function listCarriers() {
  const { data } = await apiFetch<{ data: { code: string; label: string }[] }>("/carriers", {
    auth: true,
  });
  return data;
}

/**
 * The caller's own selling account, or null.
 *
 * An administrator runs the platform and may also sell on it. If they do, that
 * account is where their supplier views should start — their own stock, not
 * somebody else's.
 */
export async function ownSellingAccount() {
  const { supplier } = await apiFetch<{ supplier: { id: string; businessName: string } | null }>(
    "/suppliers/selling-account",
    { auth: true },
  );
  return supplier;
}

/** Suppliers an admin can act for. */
export async function listActiveSuppliers() {
  const { data } = await apiFetch<{ data: { id: string; businessName: string }[] }>(
    "/suppliers?status=ACTIVE&limit=100",
    { auth: true },
  );
  return data;
}

/* ------------------------------------------------------------------ *
 * Stock
 *
 * A seller never creates a product. They add their own units against a
 * catalogue entry the platform already curates, which is what keeps one
 * product at one price per grade however many sellers hold it.
 * ------------------------------------------------------------------ */

export type ConditionGrade = "PREMIUM" | "EXCELLENT" | "GOOD" | "FAIR";

/** Category rules decide which identifier a unit needs and whether battery
 *  health is required. They come from the database, not from this file. */
export interface CategoryRules {
  slug: string;
  name: string;
  identifierType: "IMEI" | "SERIAL";
  requiresBatteryHealth: boolean;
  requiresColour: boolean;
  position: number;
}

export interface CatalogueOption {
  id: string;
  slug: string;
  title: string;
  brand: string;
  categorySlug: string;
  categoryName: string;
  totalStock: number;
}

export interface StockUnitInput {
  imei?: string;
  serialNumber?: string;
  batteryHealthPercent?: number;
}

export interface StockSubmission {
  id: string;
  listingId: string;
  listingTitle: string | null;
  conditionGrade: ConditionGrade;
  colour: string | null;
  status: "ACTIVE" | "WITHDRAWN" | "EXHAUSTED";
  supplierNotes: string | null;
  createdAt: string;
  availableUnits: number;
  units: {
    id: string;
    imei: string | null;
    serialNumber: string | null;
    batteryHealthPercent: number | null;
    status: string;
  }[];
}

/** The battery floor each grade demands. Mirrors the rule the API enforces, so
 *  the form can warn before a submission is rejected — the API remains the
 *  authority. */
export const BATTERY_FLOOR: Record<ConditionGrade, number> = {
  PREMIUM: 95,
  EXCELLENT: 90,
  GOOD: 85,
  FAIR: 80,
};

/** Published listings a seller can add stock to. Public endpoint, no token. */
export async function catalogueOptions(search?: string): Promise<CatalogueOption[]> {
  const params = new URLSearchParams({ limit: "60" });
  if (search) params.set("q", search);
  const res = await fetch(`${API_BASE}/listings?${params.toString()}`, {
    headers: { accept: "application/json" },
  });
  if (!res.ok) return [];
  const { data } = (await res.json()) as { data: CatalogueOption[] };
  return data;
}

export async function categoryRules(): Promise<CategoryRules[]> {
  const res = await fetch(`${API_BASE}/listings/categories`, { headers: { accept: "application/json" } });
  if (!res.ok) return [];
  const { data } = (await res.json()) as { data: CategoryRules[] };
  return data;
}

export async function submitStock(
  input: {
    listingId: string;
    conditionGrade: ConditionGrade;
    colour?: string;
    supplierNotes?: string;
    units: StockUnitInput[];
  },
  supplierId?: string | null,
) {
  const { submission } = await apiFetch<{ submission: StockSubmission }>("/catalogue/stock", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ ...input, ...(supplierId ? { supplierId } : {}) }),
  });
  return submission;
}

export async function myStock(
  options: { status?: "ACTIVE" | "WITHDRAWN" | "EXHAUSTED"; supplierId?: string | null } = {},
) {
  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);
  if (options.supplierId) params.set("supplierId", options.supplierId);
  const qs = params.toString();
  const { data } = await apiFetch<{ data: StockSubmission[] }>(
    `/catalogue/stock/mine${qs ? `?${qs}` : ""}`,
    { auth: true },
  );
  return data;
}

export async function withdrawStock(id: string, supplierId?: string | null) {
  const { submission } = await apiFetch<{ submission: StockSubmission }>(
    `/catalogue/stock/${id}/withdraw`,
    { method: "POST", auth: true, body: JSON.stringify(supplierId ? { supplierId } : {}) },
  );
  return submission;
}

/* ------------------------------------------------------------------ *
 * Profile
 * ------------------------------------------------------------------ */

export interface SupplierProfile {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  status: string;
  tier: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  county: string | null;
  postcode: string;
  dispatchPostcode: string;
  bankAccount: { accountHolderName: string; sortCode: string; accountNumber: string } | null;
}

export async function supplierProfile(supplierId?: string | null) {
  const { supplier } = await apiFetch<{ supplier: SupplierProfile }>(
    withActing("/supplier/profile", supplierId),
    { auth: true },
  );
  return supplier;
}

export async function updateSupplierProfile(
  input: {
    phone?: string;
    dispatchPostcode?: string;
    address?: { line1: string; line2?: string; city: string; county?: string; postcode: string };
  },
  supplierId?: string | null,
) {
  const { supplier } = await apiFetch<{ supplier: SupplierProfile }>("/supplier/profile", {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ ...input, ...(supplierId ? { supplierId } : {}) }),
  });
  return supplier;
}

export async function updateBankAccount(
  input: { accountHolderName: string; sortCode: string; accountNumber: string },
  supplierId?: string | null,
) {
  const { supplier } = await apiFetch<{ supplier: SupplierProfile }>("/supplier/profile/bank-account", {
    method: "PUT",
    auth: true,
    body: JSON.stringify({ ...input, ...(supplierId ? { supplierId } : {}) }),
  });
  return supplier;
}
