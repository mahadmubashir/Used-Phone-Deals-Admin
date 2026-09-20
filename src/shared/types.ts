/**
 * UsedPhoneDeals.com — shared domain types.
 * Canonical source: Used-Phone-Deals-Shared. Do not edit the vendored copies
 * inside the apps directly; run `npm run sync:shared` instead.
 */

/* ------------------------------------------------------------------ *
 * Identity & access
 * ------------------------------------------------------------------ */

export type Role = 'BUYER' | 'SUPPLIER' | 'CSR' | 'SUPER_ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  /** Suppliers must complete MFA before a session is considered elevated. */
  mfaEnabled: boolean;
  mfaVerified: boolean;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED';
  createdAt: string;
}

export interface LoginResponse {
  /** When true the caller must complete the MFA challenge before proceeding. */
  mfaRequired: boolean;
  mfaToken?: string;
  user?: AuthUser;
}

/* ------------------------------------------------------------------ *
 * Catalogue
 * ------------------------------------------------------------------ */

export type CategorySlug =
  | 'mobile-phones'
  | 'tablets'
  | 'laptops'
  | 'smartwatches'
  | 'accessories';

export type ConditionGrade = 'PREMIUM' | 'EXCELLENT' | 'GOOD' | 'FAIR';

export type VatScheme = 'MARGIN' | 'STANDARD';

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  position: number;
}

/**
 * A master catalogue listing. Created and priced by Admin only — suppliers
 * submit stock *against* these entries and never create or price them.
 */
export interface CatalogueListing {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: CategorySlug;
  brand: string;
  model: string;
  /** VAT-inclusive price in pence, set by Admin. */
  pricePence: number;
  vatScheme: VatScheme;
  images: ProductImage[];
  specs: ProductSpecs;
  whatsInTheBox: string[];
  /** Best (highest) condition grade currently available across all suppliers. */
  bestAvailableGrade: ConditionGrade | null;
  /** Aggregate across every supplier — buyers never see the per-supplier split. */
  totalStock: number;
  inStock: boolean;
  status: 'PUBLISHED' | 'PAUSED' | 'DRAFT';
  rating: number;
  reviewCount: number;
  notifyMeCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** Category-specific spec fields. All optional — render only what is present. */
export interface ProductSpecs {
  storage?: string;
  colour?: string;
  networkLockStatus?: 'UNLOCKED' | 'LOCKED';
  networkCarrier?: string;
  screenSize?: string;
  batteryHealthPercent?: number;
  ram?: string;
  processor?: string;
  operatingSystem?: string;
  compatibility?: string;
  strapMaterial?: string;
  [key: string]: string | number | undefined;
}

/* ------------------------------------------------------------------ *
 * Suppliers & stock
 * ------------------------------------------------------------------ */

export type SupplierTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PREMIUM';

export type SupplierStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'UNDER_REVIEW';

export interface Supplier {
  id: string;
  businessName: string;
  registeredAddress: Address;
  email: string;
  phone: string;
  vatNumber: string;
  companiesHouseNumber: string;
  tier: SupplierTier;
  status: SupplierStatus;
  stripeConnect: {
    accountId: string | null;
    kycStatus: 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
    payoutsEnabled: boolean;
  };
  totalStockUnits: number;
  fulfilmentRate: number;
  consecutiveMissedSlas: number;
  appliedAt: string;
  approvedAt: string | null;
  note?: string;
}

export type StockStatus = 'ACTIVE' | 'OUT_OF_STOCK' | 'PAUSED';

/** A supplier's stock against an existing catalogue listing. Never priced. */
export interface StockSubmission {
  id: string;
  supplierId: string;
  listingId: string;
  listingTitle: string;
  category: CategorySlug;
  /** Mandatory for phones and tablets. Never exposed on the buyer portal. */
  imei?: string;
  /** Mandatory for laptops, smartwatches and accessories. */
  serialNumber?: string;
  conditionGrade: ConditionGrade;
  colour?: string;
  batteryHealthPercent?: number;
  quantity: number;
  whatsInTheBox: string[];
  status: StockStatus;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Orders, shipping & payments
 * ------------------------------------------------------------------ */

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
}

export type OrderStatus =
  | 'PLACED'
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentMethod =
  | 'CARD'
  | 'APPLE_PAY'
  | 'GOOGLE_PAY'
  | 'KLARNA'
  | 'PAYPAL';

export interface OrderItem {
  id: string;
  listingId: string;
  listingSlug: string;
  title: string;
  imageUrl: string;
  conditionGrade: ConditionGrade;
  unitPricePence: number;
  quantity: number;
  /** Admin/CSR only — never serialised to the buyer portal. */
  supplierId?: string;
  supplierName?: string;
  reviewed?: boolean;
}

export interface Shipment {
  carrier: CarrierCode | null;
  carrierLabel: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  status:
    | 'AWAITING_DISPATCH'
    | 'IN_TRANSIT'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'EXCEPTION';
  events: TrackingEvent[];
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface TrackingEvent {
  status: string;
  description: string;
  location?: string;
  timestamp: string;
}

/**
 * A sub-order — the unit the allocation algorithm assigns to one supplier.
 * A buyer's single cart may produce several of these; the buyer only ever
 * sees one unified order.
 */
export interface Order {
  id: string;
  reference: string;
  buyerId: string | null;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  isGuest: boolean;
  items: OrderItem[];
  status: OrderStatus;
  subtotalPence: number;
  shippingPence: number;
  totalPence: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'PENDING' | 'HELD_IN_ESCROW' | 'RELEASED' | 'REFUNDED';
  deliveryAddress: Address;
  /** Supplier order views must only ever receive this, never the full address. */
  deliveryPostcode: string;
  shipment: Shipment;
  placedAt: string;
  confirmedAt: string | null;
  /** SLA deadline for supplier confirmation (1 business day from placement). */
  confirmationDueAt: string | null;
  returnWindowEndsAt: string | null;
  cancellableByBuyer: boolean;
  returnEligible: boolean;
  /** Admin/CSR only. */
  supplierId?: string;
  supplierName?: string;
  commissionPence?: number;
}

export type CarrierCode =
  | 'RM_SPECIAL_DELIVERY'
  | 'RM_TRACKED_24_SIG'
  | 'RM_TRACKED_48_SIG'
  | 'PF_EXPRESS_24'
  | 'PF_EXPRESS_48'
  | 'DPD_NEXT_DAY'
  | 'DPD_TWO_DAY'
  | 'DHL_PARCEL_CONNECT'
  | 'DHL_EXPRESS'
  | 'UPS_STANDARD'
  | 'UPS_EXPRESS';

export interface Carrier {
  code: CarrierCode;
  label: string;
  tracked: boolean;
  signatureOnDelivery: boolean;
}

/* ------------------------------------------------------------------ *
 * CSR — returns, disputes, refunds, support
 * ------------------------------------------------------------------ */

export type CaseStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'AWAITING_SUPPLIER_ACTION'
  | 'RESOLVED'
  | 'CLOSED';

export type CaseType =
  | 'RETURN_REQUEST'
  | 'REFUND_REQUEST'
  | 'COMPLAINT'
  | 'ORDER_ISSUE'
  | 'GENERAL_ENQUIRY';

export type ReturnReason =
  | 'NOT_AS_DESCRIBED'
  | 'FAULTY'
  | 'WRONG_ITEM'
  | 'DAMAGED_IN_TRANSIT'
  | 'CHANGED_MIND';

export interface CaseActivity {
  id: string;
  timestamp: string;
  agentName: string;
  action: string;
  detail?: string;
  visibleToBuyer: boolean;
}

export interface CSRCase {
  id: string;
  reference: string;
  type: CaseType;
  status: CaseStatus;
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  buyerName: string;
  buyerEmail: string;
  buyerId: string | null;
  orderReference: string;
  orderId: string;
  reason?: ReturnReason;
  description: string;
  attachments: { id: string; url: string; filename: string }[];
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  activity: CaseActivity[];
  supplierResponse: {
    supplierId: string;
    respondedAt: string;
    message: string;
  } | null;
  escalatedToAdmin: boolean;
  raisedAt: string;
  updatedAt: string;
  firstResponseDueAt: string;
  resolutionDueAt: string;
}

/** What a supplier sees — a CSR-issued instruction, never the buyer's words. */
export type SupplierNotificationType =
  | 'RETURN_RECEIVED_PROCESS_REFUND'
  | 'REPLACEMENT_REQUESTED'
  | 'ADDITIONAL_INFO_NEEDED';

export interface SupplierCsrNotification {
  id: string;
  caseReference: string;
  orderReference: string;
  type: SupplierNotificationType;
  message: string;
  status: 'ACTION_REQUIRED' | 'RESPONDED' | 'RESOLVED';
  response: string | null;
  dueAt: string;
  createdAt: string;
  respondedAt: string | null;
}

/* ------------------------------------------------------------------ *
 * Reviews
 * ------------------------------------------------------------------ */

export interface Review {
  id: string;
  listingId: string;
  listingTitle: string;
  listingSlug: string;
  buyerName: string;
  rating: number;
  body: string;
  createdAt: string;
  adminResponse: { body: string; respondedAt: string } | null;
}

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  href?: string;
  read: boolean;
  createdAt: string;
  severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
}

/* ------------------------------------------------------------------ *
 * Buyer-side
 * ------------------------------------------------------------------ */

export interface CartLine {
  listingId: string;
  slug: string;
  title: string;
  imageUrl: string;
  conditionGrade: ConditionGrade;
  unitPricePence: number;
  quantity: number;
  maxQuantity: number;
}

export interface Buyer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'SUSPENDED';
  orderCount: number;
  totalSpentPence: number;
  registeredAt: string;
  defaultAddress: Address | null;
}

/* ------------------------------------------------------------------ *
 * Earnings, commission & reporting
 * ------------------------------------------------------------------ */

export interface SupplierEarnings {
  grossSalesPence: number;
  commissionPence: number;
  netEarningsPence: number;
  pendingPayoutPence: number;
  payouts: Payout[];
}

export interface Payout {
  id: string;
  amountPence: number;
  status: 'PENDING' | 'IN_TRANSIT' | 'PAID' | 'FAILED';
  periodStart: string;
  periodEnd: string;
  releasedAt: string | null;
}

export interface CommissionRule {
  id: string;
  category: CategorySlug;
  tier: SupplierTier;
  /** Percentage, 5–15. */
  ratePercent: number;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  sort?: string;
  search?: string;
  [key: string]: unknown;
}
