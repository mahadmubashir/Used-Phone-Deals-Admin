import type {
  CarrierCode,
  Carrier,
  CaseStatus,
  CaseType,
  CategorySlug,
  ConditionGrade,
  OrderStatus,
  ReturnReason,
  Role,
  SupplierTier,
} from './types';

/* ------------------------------------------------------------------ *
 * Categories
 * ------------------------------------------------------------------ */

export interface CategoryDef {
  slug: CategorySlug;
  label: string;
  /** Phones and tablets are IMEI-tracked; everything else uses serial numbers. */
  identifier: 'IMEI' | 'SERIAL';
  requiresBatteryHealth: boolean;
}

export const CATEGORIES: CategoryDef[] = [
  { slug: 'mobile-phones', label: 'Mobile Phones', identifier: 'IMEI', requiresBatteryHealth: true },
  { slug: 'tablets', label: 'Tablets', identifier: 'IMEI', requiresBatteryHealth: true },
  { slug: 'laptops', label: 'Laptops', identifier: 'SERIAL', requiresBatteryHealth: true },
  { slug: 'smartwatches', label: 'Smartwatches', identifier: 'SERIAL', requiresBatteryHealth: true },
  { slug: 'accessories', label: 'Accessories', identifier: 'SERIAL', requiresBatteryHealth: false },
];

export const CATEGORY_MAP: Record<CategorySlug, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c]),
) as Record<CategorySlug, CategoryDef>;

export function categoryLabel(slug: CategorySlug): string {
  return CATEGORY_MAP[slug]?.label ?? slug;
}

/* ------------------------------------------------------------------ *
 * Condition grading — 4 tiers, colour coded platform-wide
 * ------------------------------------------------------------------ */

export interface ConditionGradeDef {
  value: ConditionGrade;
  label: string;
  /** Tailwind classes. Kept as literals so the JIT compiler can see them. */
  className: string;
  dotClassName: string;
  description: string;
}

export const CONDITION_GRADES: ConditionGradeDef[] = [
  {
    value: 'PREMIUM',
    label: 'Premium',
    className: 'bg-amber-100 text-amber-900 ring-amber-500/30',
    dotClassName: 'bg-amber-500',
    description:
      'Indistinguishable from new. No visible marks on the screen or body. Battery health 95% or above.',
  },
  {
    value: 'EXCELLENT',
    label: 'Excellent',
    className: 'bg-emerald-100 text-emerald-900 ring-emerald-500/30',
    dotClassName: 'bg-emerald-500',
    description:
      'Very light signs of use, only visible on close inspection. Screen is flawless. Battery health 90% or above.',
  },
  {
    value: 'GOOD',
    label: 'Good',
    className: 'bg-blue-100 text-blue-900 ring-blue-500/30',
    dotClassName: 'bg-blue-500',
    description:
      'Noticeable light scratches or scuffs on the body. Screen may have very light marks. Battery health 85% or above.',
  },
  {
    value: 'FAIR',
    label: 'Fair',
    className: 'bg-slate-200 text-slate-800 ring-slate-500/30',
    dotClassName: 'bg-slate-500',
    description:
      'Clear signs of wear including scratches, dents or deeper scuffs. Fully functional. Battery health 80% or above.',
  },
];

export const CONDITION_GRADE_MAP: Record<ConditionGrade, ConditionGradeDef> =
  Object.fromEntries(CONDITION_GRADES.map((g) => [g.value, g])) as Record<
    ConditionGrade,
    ConditionGradeDef
  >;

/** Highest grade first — used to pick the "best available" badge on a listing. */
export const GRADE_RANK: Record<ConditionGrade, number> = {
  PREMIUM: 4,
  EXCELLENT: 3,
  GOOD: 2,
  FAIR: 1,
};

/* ------------------------------------------------------------------ *
 * Approved carriers — the ONLY permitted shipping options.
 * Free-text carrier entry is never allowed anywhere in the platform.
 * Every entry is tracked + signature on delivery by contractual requirement.
 * ------------------------------------------------------------------ */

export const APPROVED_CARRIERS: Carrier[] = [
  { code: 'RM_SPECIAL_DELIVERY', label: 'Royal Mail Special Delivery Guaranteed', tracked: true, signatureOnDelivery: true },
  { code: 'RM_TRACKED_24_SIG', label: 'Royal Mail Tracked 24 + Signature', tracked: true, signatureOnDelivery: true },
  { code: 'RM_TRACKED_48_SIG', label: 'Royal Mail Tracked 48 + Signature', tracked: true, signatureOnDelivery: true },
  { code: 'PF_EXPRESS_24', label: 'Parcelforce Express 24', tracked: true, signatureOnDelivery: true },
  { code: 'PF_EXPRESS_48', label: 'Parcelforce Express 48', tracked: true, signatureOnDelivery: true },
  { code: 'DPD_NEXT_DAY', label: 'DPD Next Day', tracked: true, signatureOnDelivery: true },
  { code: 'DPD_TWO_DAY', label: 'DPD Two Day', tracked: true, signatureOnDelivery: true },
  { code: 'DHL_PARCEL_CONNECT', label: 'DHL Parcel Connect', tracked: true, signatureOnDelivery: true },
  { code: 'DHL_EXPRESS', label: 'DHL Express', tracked: true, signatureOnDelivery: true },
  { code: 'UPS_STANDARD', label: 'UPS Standard', tracked: true, signatureOnDelivery: true },
  { code: 'UPS_EXPRESS', label: 'UPS Express', tracked: true, signatureOnDelivery: true },
];

export const CARRIER_MAP: Record<CarrierCode, Carrier> = Object.fromEntries(
  APPROVED_CARRIERS.map((c) => [c.code, c]),
) as Record<CarrierCode, Carrier>;

/**
 * Guard used at the form layer AND before dispatching to the API. A carrier is
 * only valid if it is on the approved list and is tracked with signature.
 */
export function isApprovedCarrier(code: string | null | undefined): code is CarrierCode {
  if (!code) return false;
  const carrier = CARRIER_MAP[code as CarrierCode];
  return Boolean(carrier?.tracked && carrier?.signatureOnDelivery);
}

export function carrierLabel(code: CarrierCode | null | undefined): string {
  return code ? CARRIER_MAP[code]?.label ?? 'Unknown carrier' : '—';
}

/* ------------------------------------------------------------------ *
 * Order status
 * ------------------------------------------------------------------ */

export const BUYER_ORDER_TIMELINE: OrderStatus[] = [
  'PLACED',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export const ORDER_STATUS_TONES: Record<OrderStatus, StatusTone> = {
  PLACED: 'info',
  CONFIRMED: 'info',
  SHIPPED: 'progress',
  DELIVERED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  REFUNDED: 'warning',
};

/** Supplier-facing order filter tabs. */
export const SUPPLIER_ORDER_FILTERS = [
  { value: 'PLACED', label: 'Pending Confirmation' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

/* ------------------------------------------------------------------ *
 * CSR
 * ------------------------------------------------------------------ */

export type StatusTone = 'neutral' | 'info' | 'progress' | 'success' | 'warning' | 'danger';

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  AWAITING_SUPPLIER_ACTION: 'Awaiting Supplier Action',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const CASE_STATUS_TONES: Record<CaseStatus, StatusTone> = {
  OPEN: 'danger',
  IN_PROGRESS: 'progress',
  AWAITING_SUPPLIER_ACTION: 'warning',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  RETURN_REQUEST: 'Return Request',
  REFUND_REQUEST: 'Refund Request',
  COMPLAINT: 'Complaint',
  ORDER_ISSUE: 'Order Issue',
  GENERAL_ENQUIRY: 'General Enquiry',
};

export const RETURN_REASONS: { value: ReturnReason; label: string }[] = [
  { value: 'NOT_AS_DESCRIBED', label: 'Item not as described' },
  { value: 'FAULTY', label: 'Faulty or not working' },
  { value: 'WRONG_ITEM', label: 'Wrong item sent' },
  { value: 'DAMAGED_IN_TRANSIT', label: 'Item damaged in transit' },
  { value: 'CHANGED_MIND', label: 'Changed mind' },
];

export const SUPPLIER_NOTIFICATION_LABELS = {
  RETURN_RECEIVED_PROCESS_REFUND: 'Return received — process refund',
  REPLACEMENT_REQUESTED: 'Replacement requested',
  ADDITIONAL_INFO_NEEDED: 'Additional info needed',
} as const;

/* ------------------------------------------------------------------ *
 * Supplier tiers — auto-calculated from total stock units
 * ------------------------------------------------------------------ */

export const SUPPLIER_TIERS: {
  value: SupplierTier;
  label: string;
  min: number;
  max: number | null;
  points: number;
  className: string;
}[] = [
  { value: 'BRONZE', label: 'Bronze', min: 1, max: 50, points: 1, className: 'bg-orange-100 text-orange-900 ring-orange-500/30' },
  { value: 'SILVER', label: 'Silver', min: 51, max: 150, points: 2, className: 'bg-slate-200 text-slate-800 ring-slate-500/30' },
  { value: 'GOLD', label: 'Gold', min: 151, max: 300, points: 3, className: 'bg-yellow-100 text-yellow-900 ring-yellow-500/30' },
  { value: 'PREMIUM', label: 'Premium', min: 301, max: null, points: 4, className: 'bg-violet-100 text-violet-900 ring-violet-500/30' },
];

export const SUPPLIER_TIER_MAP = Object.fromEntries(
  SUPPLIER_TIERS.map((t) => [t.value, t]),
) as Record<SupplierTier, (typeof SUPPLIER_TIERS)[number]>;

export function tierForStockUnits(units: number): SupplierTier {
  if (units > 300) return 'PREMIUM';
  if (units >= 151) return 'GOLD';
  if (units >= 51) return 'SILVER';
  return 'BRONZE';
}

/* ------------------------------------------------------------------ *
 * Order allocation algorithm weights (displayed in Admin settings, executed
 * server-side — the frontend never runs allocation).
 * ------------------------------------------------------------------ */

export const ALLOCATION_WEIGHTS = {
  supplierTier: 0.4,
  geographicProximity: 0.3,
  stockQuantity: 0.15,
  fulfilmentRate: 0.15,
} as const;

/* ------------------------------------------------------------------ *
 * Filter specification, by category
 * ------------------------------------------------------------------ */

export type FilterKind = 'checkbox' | 'range' | 'rating' | 'grade';

export interface FilterDef {
  key: string;
  label: string;
  kind: FilterKind;
  options?: string[];
}

const UNIVERSAL_FILTERS: FilterDef[] = [
  { key: 'brand', label: 'Brand', kind: 'checkbox' },
  { key: 'price', label: 'Price Range', kind: 'range' },
  { key: 'grade', label: 'Condition Grade', kind: 'grade' },
  { key: 'rating', label: 'Product Rating', kind: 'rating' },
];

const CATEGORY_FILTERS: Record<CategorySlug, FilterDef[]> = {
  'mobile-phones': [
    { key: 'storage', label: 'Storage Capacity', kind: 'checkbox', options: ['64GB', '128GB', '256GB', '512GB', '1TB'] },
    { key: 'colour', label: 'Colour', kind: 'checkbox', options: ['Black', 'White', 'Blue', 'Green', 'Purple', 'Gold', 'Silver', 'Red'] },
    { key: 'networkLockStatus', label: 'Network Lock Status', kind: 'checkbox', options: ['Unlocked', 'Locked to carrier'] },
    { key: 'screenSize', label: 'Screen Size', kind: 'checkbox', options: ['Under 6"', '6"–6.4"', '6.5"–6.9"', '7" and over'] },
  ],
  tablets: [
    { key: 'storage', label: 'Storage Capacity', kind: 'checkbox', options: ['64GB', '128GB', '256GB', '512GB', '1TB'] },
    { key: 'colour', label: 'Colour', kind: 'checkbox', options: ['Black', 'White', 'Silver', 'Grey', 'Blue', 'Pink'] },
    { key: 'networkLockStatus', label: 'Network Lock Status', kind: 'checkbox', options: ['Unlocked', 'Locked to carrier'] },
    { key: 'screenSize', label: 'Screen Size', kind: 'checkbox', options: ['Under 9"', '9"–10.9"', '11"–12.9"', '13" and over'] },
  ],
  laptops: [
    { key: 'ram', label: 'RAM', kind: 'checkbox', options: ['8GB', '16GB', '24GB', '32GB', '64GB'] },
    { key: 'storage', label: 'Storage', kind: 'checkbox', options: ['256GB', '512GB', '1TB', '2TB'] },
    { key: 'processor', label: 'Processor', kind: 'checkbox', options: ['Apple M1', 'Apple M2', 'Apple M3', 'Intel Core i5', 'Intel Core i7', 'AMD Ryzen 5', 'AMD Ryzen 7'] },
    { key: 'operatingSystem', label: 'Operating System', kind: 'checkbox', options: ['macOS', 'Windows 11', 'Windows 10', 'ChromeOS'] },
    { key: 'screenSize', label: 'Screen Size', kind: 'checkbox', options: ['13"', '14"', '15"', '16"', '17"'] },
  ],
  smartwatches: [
    { key: 'compatibility', label: 'Compatibility', kind: 'checkbox', options: ['iOS', 'Android'] },
    { key: 'strapMaterial', label: 'Strap Material', kind: 'checkbox', options: ['Silicone', 'Leather', 'Stainless Steel', 'Nylon', 'Milanese Loop'] },
  ],
  accessories: [
    { key: 'compatibility', label: 'Compatibility', kind: 'checkbox', options: ['Apple', 'Samsung', 'Google', 'Universal'] },
  ],
};

export function filtersForCategory(category: CategorySlug | null): FilterDef[] {
  if (!category) return UNIVERSAL_FILTERS;
  return [...UNIVERSAL_FILTERS, ...(CATEGORY_FILTERS[category] ?? [])];
}

/* ------------------------------------------------------------------ *
 * Product spec fields shown on the buyer product page, by category.
 * IMEI is deliberately absent — it is collected from suppliers but must
 * never reach the buyer-facing frontend.
 * ------------------------------------------------------------------ */

export interface SpecFieldDef {
  key: string;
  label: string;
  suffix?: string;
}

const COMMON_SPEC_FIELDS: SpecFieldDef[] = [
  { key: 'brand', label: 'Brand' },
  { key: 'model', label: 'Model' },
];

const SPEC_FIELDS: Record<CategorySlug, SpecFieldDef[]> = {
  'mobile-phones': [
    { key: 'storage', label: 'Storage' },
    { key: 'colour', label: 'Colour' },
    { key: 'networkLockStatus', label: 'Network Lock Status' },
    { key: 'screenSize', label: 'Screen Size' },
    { key: 'batteryHealthPercent', label: 'Battery Health', suffix: '%' },
  ],
  tablets: [
    { key: 'storage', label: 'Storage' },
    { key: 'colour', label: 'Colour' },
    { key: 'networkLockStatus', label: 'Network Lock Status' },
    { key: 'screenSize', label: 'Screen Size' },
    { key: 'batteryHealthPercent', label: 'Battery Health', suffix: '%' },
  ],
  laptops: [
    { key: 'ram', label: 'RAM' },
    { key: 'storage', label: 'Storage' },
    { key: 'processor', label: 'Processor' },
    { key: 'operatingSystem', label: 'Operating System' },
    { key: 'screenSize', label: 'Screen Size' },
    { key: 'batteryHealthPercent', label: 'Battery Health', suffix: '%' },
  ],
  smartwatches: [
    { key: 'compatibility', label: 'Compatibility' },
    { key: 'strapMaterial', label: 'Strap Material' },
    { key: 'batteryHealthPercent', label: 'Battery Health', suffix: '%' },
  ],
  accessories: [
    { key: 'compatibility', label: 'Compatibility' },
    { key: 'colour', label: 'Colour' },
  ],
};

export function specFieldsForCategory(category: CategorySlug): SpecFieldDef[] {
  return [...COMMON_SPEC_FIELDS, ...(SPEC_FIELDS[category] ?? [])];
}

/**
 * Fields a supplier fills in when submitting stock. Note the complete absence
 * of any price field — pricing is Admin-only and never surfaced to suppliers.
 */
export interface StockFieldDef {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'select' | 'checklist';
  required: boolean;
  options?: string[];
  help?: string;
  min?: number;
  max?: number;
  pattern?: string;
}

export const WHATS_IN_THE_BOX_OPTIONS = [
  'Device',
  'Charging cable',
  'Mains adapter',
  'Original box',
  'SIM tray tool',
  'Protective case',
  'Screen protector (fitted)',
  'Earphones',
  'Documentation',
  'Spare strap',
];

export const COLOUR_OPTIONS = [
  'Black', 'White', 'Silver', 'Grey', 'Space Grey', 'Gold', 'Blue',
  'Green', 'Purple', 'Pink', 'Red', 'Yellow', 'Titanium',
];

export function stockFieldsForCategory(category: CategorySlug): StockFieldDef[] {
  const def = CATEGORY_MAP[category];
  const fields: StockFieldDef[] = [];

  if (def.identifier === 'IMEI') {
    fields.push({
      key: 'imei',
      label: 'IMEI',
      kind: 'text',
      required: true,
      pattern: '^\\d{15}$',
      help: '15 digits. Used for internal traceability only — never shown to buyers.',
    });
  } else {
    fields.push({
      key: 'serialNumber',
      label: 'Serial Number',
      kind: 'text',
      required: true,
      help: 'As printed on the device or its original packaging.',
    });
  }

  fields.push({
    key: 'conditionGrade',
    label: 'Condition Grade',
    kind: 'select',
    required: true,
    options: CONDITION_GRADES.map((g) => g.label),
    help: 'Grade each unit honestly using the on-screen guidance.',
  });

  if (category === 'mobile-phones' || category === 'tablets') {
    fields.push({ key: 'colour', label: 'Colour', kind: 'select', required: true, options: COLOUR_OPTIONS });
  }

  if (def.requiresBatteryHealth) {
    fields.push({
      key: 'batteryHealthPercent',
      label: 'Battery Health',
      kind: 'number',
      required: true,
      min: 0,
      max: 100,
      help: 'Percentage as reported by the device diagnostics.',
    });
  }

  fields.push({ key: 'quantity', label: 'Quantity', kind: 'number', required: true, min: 1, max: 999 });
  fields.push({
    key: 'whatsInTheBox',
    label: "What's in the Box",
    kind: 'checklist',
    required: true,
    options: WHATS_IN_THE_BOX_OPTIONS,
  });

  return fields;
}

/* ------------------------------------------------------------------ *
 * Role-based access — the single source of truth for both the routing
 * guards and the navigation. Section keys map 1:1 to admin portal routes.
 * ------------------------------------------------------------------ */

export type PortalSection =
  | 'supplier:home'
  | 'supplier:submit-stock'
  | 'supplier:stock'
  | 'supplier:orders'
  | 'supplier:csr-notifications'
  | 'supplier:earnings'
  | 'supplier:settings'
  | 'csr:home'
  | 'csr:queue'
  | 'csr:case'
  | 'csr:orders'
  | 'admin:home'
  | 'admin:catalogue'
  | 'admin:suppliers'
  | 'admin:orders'
  | 'admin:buyers'
  | 'admin:reports'
  | 'admin:settings';

/**
 * CSR agents are restricted to the CSR module and order management only —
 * no catalogue, no supplier accounts, no financial reporting, no commission
 * settings, no platform configuration. Enforced at the router, not just the UI.
 */
export const ROLE_SECTIONS: Record<Role, PortalSection[]> = {
  SUPPLIER: [
    'supplier:home',
    'supplier:submit-stock',
    'supplier:stock',
    'supplier:orders',
    'supplier:csr-notifications',
    'supplier:earnings',
    'supplier:settings',
  ],
  CSR: ['csr:home', 'csr:queue', 'csr:case', 'csr:orders'],
  SUPER_ADMIN: [
    'admin:home',
    'admin:catalogue',
    'admin:suppliers',
    'admin:orders',
    'admin:buyers',
    'admin:reports',
    'admin:settings',
    'csr:home',
    'csr:queue',
    'csr:case',
    'csr:orders',
  ],
  // Buyers have no access to the supplier/admin portal at all.
  BUYER: [],
};

export function canAccess(role: Role | undefined | null, section: PortalSection): boolean {
  if (!role) return false;
  return ROLE_SECTIONS[role]?.includes(section) ?? false;
}

/** Roles permitted to authenticate against the supplier/admin portal. */
export const PORTAL_ROLES: Role[] = ['SUPPLIER', 'CSR', 'SUPER_ADMIN'];

export const ROLE_LABELS: Record<Role, string> = {
  BUYER: 'Buyer',
  SUPPLIER: 'Supplier',
  CSR: 'Customer Service',
  SUPER_ADMIN: 'Super Admin',
};

/* ------------------------------------------------------------------ *
 * SLAs & windows
 * ------------------------------------------------------------------ */

export const SLA = {
  /** Supplier must confirm an allocated order within 1 business day. */
  supplierOrderConfirmationDays: 1,
  /** Supplier must act on a CSR return instruction within 2 business days. */
  supplierCsrResponseDays: 2,
  /** CSR first response to buyer. */
  csrFirstResponseDays: 1,
  /** CSR case resolution target. */
  csrResolutionDays: 3,
  /** Escrow hold / buyer return window. */
  returnWindowDays: 30,
} as const;

export const TRUST_SIGNALS = [
  { title: '30-Day Returns', detail: 'On every order, no quibbles' },
  { title: 'Verified Suppliers', detail: 'Every unit checked and graded' },
  { title: 'Tracked Delivery', detail: 'Signed for, every time' },
  { title: 'Secure Payments', detail: 'Protected until you are happy' },
] as const;

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
] as const;
