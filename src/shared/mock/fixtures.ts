/**
 * Deterministic fixtures so both portals are fully explorable with no backend.
 * Swap `USE_MOCKS` to false in the env once the API is live — no component
 * changes are needed.
 */
import { tierForStockUnits } from '../constants';
import type {
  AppNotification,
  Buyer,
  CSRCase,
  CatalogueListing,
  CategorySlug,
  CommissionRule,
  ConditionGrade,
  Order,
  Review,
  StockSubmission,
  Supplier,
  SupplierCsrNotification,
  SupplierEarnings,
} from '../types';

const DAY = 86_400_000;
const now = () => Date.now();
const iso = (offsetDays: number, hours = 0) =>
  new Date(now() + offsetDays * DAY + hours * 3_600_000).toISOString();

function placeholder(label: string, index: number): string {
  const palette = ['e2e8f0', 'f1f5f9', 'e0f2fe', 'ede9fe'];
  return `https://placehold.co/900x900/${palette[index % palette.length]}/475569.png?text=${encodeURIComponent(
    label,
  )}`;
}

function images(title: string, count = 4) {
  return Array.from({ length: count }, (_, i) => ({
    id: `img-${slugify(title)}-${i}`,
    url: placeholder(`${title} ${i + 1}`, i),
    alt: `${title} — photo ${i + 1} of ${count}`,
    position: i,
  }));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/* ------------------------------------------------------------------ *
 * Catalogue
 * ------------------------------------------------------------------ */

interface Seed {
  title: string;
  category: CategorySlug;
  brand: string;
  model: string;
  price: number;
  grade: ConditionGrade;
  stock: number;
  rating: number;
  reviews: number;
  specs: Record<string, string | number>;
  box: string[];
  description: string;
}

const SEEDS: Seed[] = [
  {
    title: 'Apple iPhone 14 Pro 256GB',
    category: 'mobile-phones',
    brand: 'Apple',
    model: 'iPhone 14 Pro',
    price: 62999,
    grade: 'PREMIUM',
    stock: 14,
    rating: 4.7,
    reviews: 128,
    specs: { storage: '256GB', colour: 'Deep Purple', networkLockStatus: 'UNLOCKED', screenSize: '6.1"', batteryHealthPercent: 96 },
    box: ['Device', 'Charging cable', 'SIM tray tool', 'Documentation'],
    description:
      'A fully tested iPhone 14 Pro with the A16 Bionic chip, 48MP main camera and the Always-On display. Every unit is professionally inspected, data-wiped and graded against our four-tier standard before it is listed.',
  },
  {
    title: 'Apple iPhone 13 128GB',
    category: 'mobile-phones',
    brand: 'Apple',
    model: 'iPhone 13',
    price: 38999,
    grade: 'EXCELLENT',
    stock: 27,
    rating: 4.6,
    reviews: 213,
    specs: { storage: '128GB', colour: 'Midnight', networkLockStatus: 'UNLOCKED', screenSize: '6.1"', batteryHealthPercent: 91 },
    box: ['Device', 'Charging cable', 'Documentation'],
    description:
      'The iPhone 13 pairs a bright Super Retina XDR display with all-day battery life. Refurbished to a high standard and covered by our 30-day returns promise.',
  },
  {
    title: 'Samsung Galaxy S23 Ultra 512GB',
    category: 'mobile-phones',
    brand: 'Samsung',
    model: 'Galaxy S23 Ultra',
    price: 71999,
    grade: 'EXCELLENT',
    stock: 8,
    rating: 4.8,
    reviews: 76,
    specs: { storage: '512GB', colour: 'Phantom Black', networkLockStatus: 'UNLOCKED', screenSize: '6.8"', batteryHealthPercent: 93 },
    box: ['Device', 'Charging cable', 'SIM tray tool', 'Original box'],
    description:
      'Flagship Galaxy performance with the built-in S Pen and a 200MP camera. Inspected, graded and ready to go.',
  },
  {
    title: 'Google Pixel 7 128GB',
    category: 'mobile-phones',
    brand: 'Google',
    model: 'Pixel 7',
    price: 27999,
    grade: 'GOOD',
    stock: 0,
    rating: 4.4,
    reviews: 54,
    specs: { storage: '128GB', colour: 'Snow', networkLockStatus: 'UNLOCKED', screenSize: '6.3"', batteryHealthPercent: 88 },
    box: ['Device', 'Charging cable'],
    description:
      'Clean Android with Google Tensor G2 and one of the best point-and-shoot cameras on any phone.',
  },
  {
    title: 'Apple iPhone 12 64GB',
    category: 'mobile-phones',
    brand: 'Apple',
    model: 'iPhone 12',
    price: 22999,
    grade: 'FAIR',
    stock: 41,
    rating: 4.1,
    reviews: 189,
    specs: { storage: '64GB', colour: 'Blue', networkLockStatus: 'LOCKED', screenSize: '6.1"', batteryHealthPercent: 84 },
    box: ['Device', 'Charging cable'],
    description:
      'A budget-friendly iPhone 12 with visible cosmetic wear but full functionality. Locked to EE.',
  },
  {
    title: 'Apple iPad Air 5th Gen 256GB',
    category: 'tablets',
    brand: 'Apple',
    model: 'iPad Air (5th generation)',
    price: 44999,
    grade: 'PREMIUM',
    stock: 11,
    rating: 4.9,
    reviews: 62,
    specs: { storage: '256GB', colour: 'Space Grey', networkLockStatus: 'UNLOCKED', screenSize: '10.9"', batteryHealthPercent: 97 },
    box: ['Device', 'Charging cable', 'Mains adapter', 'Original box'],
    description:
      'The M1-powered iPad Air with a 10.9" Liquid Retina display. Indistinguishable from new.',
  },
  {
    title: 'Samsung Galaxy Tab S8 128GB',
    category: 'tablets',
    brand: 'Samsung',
    model: 'Galaxy Tab S8',
    price: 33999,
    grade: 'GOOD',
    stock: 6,
    rating: 4.3,
    reviews: 31,
    specs: { storage: '128GB', colour: 'Graphite', networkLockStatus: 'UNLOCKED', screenSize: '11"', batteryHealthPercent: 89 },
    box: ['Device', 'Charging cable', 'Mains adapter'],
    description: 'A capable Android tablet with an 11" 120Hz display and the S Pen included.',
  },
  {
    title: 'Apple MacBook Air M2 13" 512GB',
    category: 'laptops',
    brand: 'Apple',
    model: 'MacBook Air (M2, 2022)',
    price: 94999,
    grade: 'EXCELLENT',
    stock: 9,
    rating: 4.8,
    reviews: 87,
    specs: { ram: '16GB', storage: '512GB', processor: 'Apple M2', operatingSystem: 'macOS', screenSize: '13"', batteryHealthPercent: 94 },
    box: ['Device', 'Charging cable', 'Mains adapter', 'Original box'],
    description:
      'Silent, fanless and fast. The M2 MacBook Air with 16GB of unified memory and a 13.6" Liquid Retina display.',
  },
  {
    title: 'Dell XPS 13 9320 16GB',
    category: 'laptops',
    brand: 'Dell',
    model: 'XPS 13 9320',
    price: 64999,
    grade: 'GOOD',
    stock: 4,
    rating: 4.2,
    reviews: 22,
    specs: { ram: '16GB', storage: '512GB', processor: 'Intel Core i7', operatingSystem: 'Windows 11', screenSize: '13"', batteryHealthPercent: 86 },
    box: ['Device', 'Charging cable', 'Mains adapter'],
    description: 'A compact Windows ultrabook with a near-borderless InfinityEdge display.',
  },
  {
    title: 'Lenovo ThinkPad X1 Carbon Gen 10',
    category: 'laptops',
    brand: 'Lenovo',
    model: 'ThinkPad X1 Carbon Gen 10',
    price: 74999,
    grade: 'EXCELLENT',
    stock: 3,
    rating: 4.6,
    reviews: 18,
    specs: { ram: '32GB', storage: '1TB', processor: 'Intel Core i7', operatingSystem: 'Windows 11', screenSize: '14"', batteryHealthPercent: 92 },
    box: ['Device', 'Charging cable', 'Mains adapter', 'Documentation'],
    description: 'A business-class ultralight with a legendary keyboard and full port selection.',
  },
  {
    title: 'Apple Watch Series 8 45mm GPS',
    category: 'smartwatches',
    brand: 'Apple',
    model: 'Watch Series 8 (45mm)',
    price: 24999,
    grade: 'EXCELLENT',
    stock: 16,
    rating: 4.5,
    reviews: 94,
    specs: { compatibility: 'iOS', strapMaterial: 'Silicone', batteryHealthPercent: 90 },
    box: ['Device', 'Charging cable', 'Spare strap'],
    description:
      'Crash detection, temperature sensing and an always-on Retina display. Supplied with a new silicone strap.',
  },
  {
    title: 'Samsung Galaxy Watch 5 Pro',
    category: 'smartwatches',
    brand: 'Samsung',
    model: 'Galaxy Watch 5 Pro',
    price: 19999,
    grade: 'GOOD',
    stock: 0,
    rating: 4.3,
    reviews: 37,
    specs: { compatibility: 'Android', strapMaterial: 'Stainless Steel', batteryHealthPercent: 87 },
    box: ['Device', 'Charging cable'],
    description: 'A rugged titanium smartwatch with sapphire crystal and multi-day battery life.',
  },
  {
    title: 'Apple AirPods Pro (2nd generation)',
    category: 'accessories',
    brand: 'Apple',
    model: 'AirPods Pro 2',
    price: 15999,
    grade: 'PREMIUM',
    stock: 33,
    rating: 4.7,
    reviews: 156,
    specs: { compatibility: 'Apple', colour: 'White' },
    box: ['Device', 'Charging cable', 'Original box'],
    description:
      'Active noise cancellation and Adaptive Transparency, with a professionally sanitised set of ear tips.',
  },
  {
    title: 'Anker 737 Power Bank 24,000mAh',
    category: 'accessories',
    brand: 'Anker',
    model: '737 PowerCore',
    price: 8999,
    grade: 'GOOD',
    stock: 22,
    rating: 4.4,
    reviews: 41,
    specs: { compatibility: 'Universal', colour: 'Black' },
    box: ['Device', 'Charging cable', 'Documentation'],
    description: 'A 140W USB-C power bank that can fast-charge a MacBook Pro as well as a phone.',
  },
  {
    title: 'Apple Magic Keyboard for iPad Pro 12.9"',
    category: 'accessories',
    brand: 'Apple',
    model: 'Magic Keyboard (12.9")',
    price: 19999,
    grade: 'FAIR',
    stock: 7,
    rating: 3.9,
    reviews: 12,
    specs: { compatibility: 'Apple', colour: 'Black' },
    box: ['Device'],
    description: 'A floating keyboard case with a trackpad. Shows visible wear on the exterior fabric.',
  },
];

export const mockListings: CatalogueListing[] = SEEDS.map((seed, index) => ({
  id: `lst_${String(index + 1).padStart(4, '0')}`,
  slug: slugify(seed.title),
  title: seed.title,
  description: seed.description,
  category: seed.category,
  brand: seed.brand,
  model: seed.model,
  pricePence: seed.price,
  vatScheme: seed.brand === 'Apple' ? 'MARGIN' : 'STANDARD',
  images: images(seed.title),
  specs: seed.specs,
  whatsInTheBox: seed.box,
  bestAvailableGrade: seed.stock > 0 ? seed.grade : null,
  totalStock: seed.stock,
  inStock: seed.stock > 0,
  status: 'PUBLISHED',
  rating: seed.rating,
  reviewCount: seed.reviews,
  notifyMeCount: seed.stock === 0 ? 12 + index : 0,
  createdAt: iso(-(index + 3)),
  updatedAt: iso(-index),
}));

/* ------------------------------------------------------------------ *
 * Suppliers — never surfaced on the buyer portal
 * ------------------------------------------------------------------ */

const SUPPLIER_SEEDS = [
  { name: 'Connect Mobile Guildford', units: 412, status: 'ACTIVE', rate: 0.97, city: 'Guildford', postcode: 'GU1 3DY' },
  { name: 'Southbank Tech Trading', units: 218, status: 'ACTIVE', rate: 0.93, city: 'London', postcode: 'SE1 9SG' },
  { name: 'Northern Device Exchange', units: 96, status: 'ACTIVE', rate: 0.88, city: 'Manchester', postcode: 'M1 4BT' },
  { name: 'Bristol Refurb Co', units: 34, status: 'ACTIVE', rate: 0.79, city: 'Bristol', postcode: 'BS1 4DJ' },
  { name: 'Midlands Mobile Supply', units: 0, status: 'PENDING', rate: 0, city: 'Birmingham', postcode: 'B2 4QA' },
  { name: 'Coastal Gadget Traders', units: 61, status: 'SUSPENDED', rate: 0.61, city: 'Brighton', postcode: 'BN1 1AA' },
  { name: 'Leeds Electronics Wholesale', units: 0, status: 'PENDING', rate: 0, city: 'Leeds', postcode: 'LS1 4AP' },
] as const;

export const mockSuppliers: Supplier[] = SUPPLIER_SEEDS.map((seed, index) => ({
  id: `sup_${String(index + 1).padStart(4, '0')}`,
  businessName: seed.name,
  registeredAddress: {
    line1: `${10 + index} High Street`,
    city: seed.city,
    postcode: seed.postcode,
    country: 'United Kingdom',
  },
  email: `accounts@${slugify(seed.name)}.co.uk`,
  phone: `+44 7${String(700000000 + index * 111111).slice(0, 9)}`,
  vatNumber: `GB${123456780 + index}`,
  companiesHouseNumber: `${10234567 + index}`,
  tier: tierForStockUnits(seed.units),
  status: seed.status,
  stripeConnect: {
    accountId: seed.status === 'PENDING' ? null : `acct_mock_${index}`,
    kycStatus: seed.status === 'PENDING' ? 'PENDING' : 'VERIFIED',
    payoutsEnabled: seed.status === 'ACTIVE',
  },
  totalStockUnits: seed.units,
  fulfilmentRate: seed.rate,
  consecutiveMissedSlas: seed.status === 'SUSPENDED' ? 3 : 0,
  appliedAt: iso(-(60 - index * 7)),
  approvedAt: seed.status === 'PENDING' ? null : iso(-(55 - index * 7)),
}));

/** The signed-in supplier for the supplier dashboard fixtures. */
export const mockCurrentSupplier = mockSuppliers[0];

export const mockStock: StockSubmission[] = mockListings.slice(0, 9).map((listing, index) => ({
  id: `stk_${String(index + 1).padStart(4, '0')}`,
  supplierId: mockCurrentSupplier.id,
  listingId: listing.id,
  listingTitle: listing.title,
  category: listing.category,
  imei:
    listing.category === 'mobile-phones' || listing.category === 'tablets'
      ? `35${String(123456789012 + index * 7)}`.slice(0, 15)
      : undefined,
  serialNumber:
    listing.category === 'mobile-phones' || listing.category === 'tablets'
      ? undefined
      : `SN${String(90210000 + index * 1234)}`,
  conditionGrade: listing.bestAvailableGrade ?? 'GOOD',
  colour: listing.specs.colour as string | undefined,
  batteryHealthPercent: listing.specs.batteryHealthPercent as number | undefined,
  quantity: Math.max(1, listing.totalStock),
  whatsInTheBox: listing.whatsInTheBox,
  status: listing.totalStock === 0 ? 'OUT_OF_STOCK' : index === 4 ? 'PAUSED' : 'ACTIVE',
  createdAt: iso(-(20 - index)),
  updatedAt: iso(-(index + 1)),
}));

/* ------------------------------------------------------------------ *
 * Buyers
 * ------------------------------------------------------------------ */

const BUYER_SEEDS = [
  ['Priya', 'Raman', 'priya.raman@example.co.uk'],
  ['Tom', 'Whitfield', 'tom.whitfield@example.co.uk'],
  ['Amara', 'Okafor', 'amara.okafor@example.co.uk'],
  ['Jack', 'Sutherland', 'jack.sutherland@example.co.uk'],
  ['Elena', 'Moreau', 'elena.moreau@example.co.uk'],
  ['Danny', 'Fletcher', 'danny.fletcher@example.co.uk'],
] as const;

export const mockBuyers: Buyer[] = BUYER_SEEDS.map(([firstName, lastName, email], index) => ({
  id: `byr_${String(index + 1).padStart(4, '0')}`,
  firstName,
  lastName,
  email,
  phone: `+44 7${String(800000000 + index * 234567).slice(0, 9)}`,
  status: index === 5 ? 'SUSPENDED' : 'ACTIVE',
  orderCount: 1 + index * 2,
  totalSpentPence: 24999 + index * 38000,
  registeredAt: iso(-(120 - index * 11)),
  defaultAddress: {
    line1: `${4 + index} Alma Road`,
    city: 'Guildford',
    county: 'Surrey',
    postcode: 'GU1 4QX',
    country: 'United Kingdom',
  },
}));

export const mockCurrentBuyer = mockBuyers[0];

/* ------------------------------------------------------------------ *
 * Orders
 * ------------------------------------------------------------------ */

function buildOrder(index: number): Order {
  const listing = mockListings[index % mockListings.length];
  const buyer = mockBuyers[index % mockBuyers.length];
  const supplier = mockSuppliers[index % 4];
  const statuses: Order['status'][] = [
    'DELIVERED',
    'SHIPPED',
    'PLACED',
    'COMPLETED',
    'CONFIRMED',
    'CANCELLED',
    'DELIVERED',
    'SHIPPED',
  ];
  const status = statuses[index % statuses.length];
  const placedAt = iso(-(index + 2));
  const shipped = ['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(status);
  const delivered = ['DELIVERED', 'COMPLETED'].includes(status);
  const subtotal = listing.pricePence;

  return {
    id: `ord_${String(index + 1).padStart(4, '0')}`,
    reference: `UPD-${24000 + index}`,
    buyerId: index === 3 ? null : buyer.id,
    buyerName: index === 3 ? 'Guest Customer' : `${buyer.firstName} ${buyer.lastName}`,
    buyerEmail: buyer.email,
    buyerPhone: buyer.phone,
    isGuest: index === 3,
    items: [
      {
        id: `oit_${index}_1`,
        listingId: listing.id,
        listingSlug: listing.slug,
        title: listing.title,
        imageUrl: listing.images[0].url,
        conditionGrade: listing.bestAvailableGrade ?? 'GOOD',
        unitPricePence: listing.pricePence,
        quantity: 1,
        supplierId: supplier.id,
        supplierName: supplier.businessName,
        reviewed: status === 'COMPLETED' && index % 3 === 0,
      },
    ],
    status,
    subtotalPence: subtotal,
    shippingPence: 0,
    totalPence: subtotal,
    paymentMethod: (['CARD', 'APPLE_PAY', 'PAYPAL', 'KLARNA', 'GOOGLE_PAY'] as const)[index % 5],
    paymentStatus:
      status === 'CANCELLED' ? 'REFUNDED' : status === 'COMPLETED' ? 'RELEASED' : 'HELD_IN_ESCROW',
    deliveryAddress: buyer.defaultAddress!,
    deliveryPostcode: buyer.defaultAddress!.postcode,
    shipment: {
      carrier: shipped ? 'RM_SPECIAL_DELIVERY' : null,
      carrierLabel: shipped ? 'Royal Mail Special Delivery Guaranteed' : null,
      trackingNumber: shipped ? `RM${String(482910375 + index)}GB` : null,
      trackingUrl: shipped ? 'https://www.royalmail.com/track-your-item' : null,
      status: delivered ? 'DELIVERED' : shipped ? (index === 7 ? 'EXCEPTION' : 'IN_TRANSIT') : 'AWAITING_DISPATCH',
      events: shipped
        ? [
            ...(delivered
              ? [
                  {
                    status: 'DELIVERED',
                    description: 'Delivered and signed for',
                    location: 'Guildford',
                    timestamp: iso(-(index - 1)),
                  },
                ]
              : []),
            {
              status: 'IN_TRANSIT',
              description: 'Item received at local delivery office',
              location: 'Guildford Delivery Office',
              timestamp: iso(-(index)),
            },
            {
              status: 'ACCEPTED',
              description: 'Item accepted at Post Office branch',
              location: 'Manchester Mail Centre',
              timestamp: iso(-(index + 1)),
            },
          ]
        : [],
      shippedAt: shipped ? iso(-(index + 1)) : null,
      deliveredAt: delivered ? iso(-(index - 1)) : null,
    },
    placedAt,
    confirmedAt: status === 'PLACED' ? null : iso(-(index + 1), 4),
    confirmationDueAt: status === 'PLACED' ? iso(0, 6) : null,
    returnWindowEndsAt: delivered ? iso(30 - index) : null,
    cancellableByBuyer: status === 'PLACED' || status === 'CONFIRMED',
    returnEligible: delivered,
    supplierId: supplier.id,
    supplierName: supplier.businessName,
    commissionPence: Math.round(subtotal * 0.09),
  };
}

export const mockOrders: Order[] = Array.from({ length: 16 }, (_, i) => buildOrder(i));

/** Orders allocated to the signed-in supplier. */
export const mockSupplierOrders: Order[] = mockOrders.filter(
  (order) => order.supplierId === mockCurrentSupplier.id,
);

/* ------------------------------------------------------------------ *
 * CSR cases
 * ------------------------------------------------------------------ */

const CASE_SEEDS = [
  { type: 'RETURN_REQUEST', status: 'OPEN', reason: 'FAULTY', description: 'The phone will not hold a charge for more than two hours despite the listing saying 91% battery health. I have tried two different cables.' },
  { type: 'ORDER_ISSUE', status: 'IN_PROGRESS', reason: undefined, description: 'Tracking has not updated for four days and the carrier site says "awaiting item". Could you check where my order is please?' },
  { type: 'RETURN_REQUEST', status: 'AWAITING_SUPPLIER_ACTION', reason: 'NOT_AS_DESCRIBED', description: 'Listed as Excellent but there is a deep scratch across the bottom third of the screen, clearly visible when the display is on.' },
  { type: 'REFUND_REQUEST', status: 'OPEN', reason: 'DAMAGED_IN_TRANSIT', description: 'Box arrived crushed on one corner and the screen is cracked. I have photos of the packaging as it arrived.' },
  { type: 'COMPLAINT', status: 'RESOLVED', reason: undefined, description: 'Delivery was left with a neighbour despite signature on delivery being promised.' },
  { type: 'GENERAL_ENQUIRY', status: 'CLOSED', reason: undefined, description: 'Does the MacBook Air come with the original 35W dual-port adapter or a generic one?' },
  { type: 'RETURN_REQUEST', status: 'IN_PROGRESS', reason: 'WRONG_ITEM', description: 'I ordered the 256GB model and received the 128GB. The IMEI on the box does not match my order confirmation.' },
  { type: 'REFUND_REQUEST', status: 'AWAITING_SUPPLIER_ACTION', reason: 'CHANGED_MIND', description: 'Changed my mind, still sealed and unused. Within the 30 day window.' },
] as const;

export const mockCases: CSRCase[] = CASE_SEEDS.map((seed, index) => {
  const order = mockOrders[index];
  const buyer = mockBuyers[index % mockBuyers.length];
  const escalated = index === 3;
  return {
    id: `case_${String(index + 1).padStart(4, '0')}`,
    reference: `CSR-${8100 + index}`,
    type: seed.type,
    status: seed.status,
    priority: escalated || index === 0 ? 'HIGH' : index % 3 === 0 ? 'LOW' : 'NORMAL',
    buyerName: `${buyer.firstName} ${buyer.lastName}`,
    buyerEmail: buyer.email,
    buyerId: buyer.id,
    orderReference: order.reference,
    orderId: order.id,
    reason: seed.reason,
    description: seed.description,
    attachments:
      index === 3
        ? [{ id: 'att_1', url: placeholder('Evidence photo', 1), filename: 'damaged-packaging.jpg' }]
        : [],
    assignedAgentId: seed.status === 'OPEN' ? null : 'csr_0001',
    assignedAgentName: seed.status === 'OPEN' ? null : 'Sarah Bennett',
    activity: [
      {
        id: `act_${index}_1`,
        timestamp: iso(-(index + 1)),
        agentName: 'System',
        action: 'Case created',
        detail: 'Routed to the CSR queue automatically on buyer submission.',
        visibleToBuyer: false,
      },
      ...(seed.status !== 'OPEN'
        ? [
            {
              id: `act_${index}_2`,
              timestamp: iso(-index, 2),
              agentName: 'Sarah Bennett',
              action: 'Replied to buyer',
              detail: 'Acknowledged the issue and requested photos of the device.',
              visibleToBuyer: true,
            },
          ]
        : []),
      ...(seed.status === 'AWAITING_SUPPLIER_ACTION'
        ? [
            {
              id: `act_${index}_3`,
              timestamp: iso(-index, 5),
              agentName: 'Sarah Bennett',
              action: 'Notified supplier',
              detail: 'Instructed the supplier to confirm receipt and process the refund within 2 business days.',
              visibleToBuyer: false,
            },
          ]
        : []),
    ],
    supplierResponse:
      seed.status === 'AWAITING_SUPPLIER_ACTION' && index === 2
        ? {
            supplierId: mockCurrentSupplier.id,
            respondedAt: iso(-index, 8),
            message:
              'Return received and inspected. The screen damage is confirmed — refund approved from our side.',
          }
        : null,
    escalatedToAdmin: escalated,
    raisedAt: iso(-(index + 1)),
    updatedAt: iso(-index, 6),
    firstResponseDueAt: iso(-(index + 1) + 1),
    resolutionDueAt: iso(-(index + 1) + 3),
  };
});

export const mockSupplierCsrNotifications: SupplierCsrNotification[] = [
  {
    id: 'sn_0001',
    caseReference: 'CSR-8102',
    orderReference: mockOrders[2].reference,
    type: 'RETURN_RECEIVED_PROCESS_REFUND',
    message:
      'A return for this order is in transit back to you. Confirm receipt and process the refund within 2 business days.',
    status: 'ACTION_REQUIRED',
    response: null,
    dueAt: iso(1, 4),
    createdAt: iso(-1),
    respondedAt: null,
  },
  {
    id: 'sn_0002',
    caseReference: 'CSR-8107',
    orderReference: mockOrders[7].reference,
    type: 'REPLACEMENT_REQUESTED',
    message: 'The buyer has requested a replacement unit of the same condition grade. Can you fulfil this?',
    status: 'RESPONDED',
    response: 'Yes — we have a Premium grade unit in stock and can dispatch tomorrow.',
    dueAt: iso(-1),
    createdAt: iso(-3),
    respondedAt: iso(-2),
  },
  {
    id: 'sn_0003',
    caseReference: 'CSR-8104',
    orderReference: mockOrders[4].reference,
    type: 'ADDITIONAL_INFO_NEEDED',
    message: 'Please confirm which carrier service was used and provide the proof of signature.',
    status: 'RESOLVED',
    response: 'Royal Mail Special Delivery. Signature scan attached to the tracking record.',
    dueAt: iso(-5),
    createdAt: iso(-7),
    respondedAt: iso(-6),
  },
];

/* ------------------------------------------------------------------ *
 * Reviews, notifications, earnings, commission
 * ------------------------------------------------------------------ */

export const mockReviews: Review[] = [
  {
    id: 'rev_0001',
    listingId: mockListings[0].id,
    listingTitle: mockListings[0].title,
    listingSlug: mockListings[0].slug,
    buyerName: 'Priya R.',
    rating: 5,
    body: 'Genuinely could not tell this was refurbished. Battery health was exactly as listed at 96% and it arrived next day, signed for.',
    createdAt: iso(-4),
    adminResponse: {
      body: 'Thank you Priya — glad it arrived quickly. Enjoy the phone!',
      respondedAt: iso(-3),
    },
  },
  {
    id: 'rev_0002',
    listingId: mockListings[0].id,
    listingTitle: mockListings[0].title,
    listingSlug: mockListings[0].slug,
    buyerName: 'Tom W.',
    rating: 4,
    body: 'Very good condition, tiny mark on the frame that you have to hunt for. Fast delivery and clear packaging.',
    createdAt: iso(-9),
    adminResponse: null,
  },
  {
    id: 'rev_0003',
    listingId: mockListings[1].id,
    listingTitle: mockListings[1].title,
    listingSlug: mockListings[1].slug,
    buyerName: 'Amara O.',
    rating: 5,
    body: 'Second phone I have bought here. Consistent grading, which is exactly what I want from a used marketplace.',
    createdAt: iso(-12),
    adminResponse: null,
  },
  {
    id: 'rev_0004',
    listingId: mockListings[7].id,
    listingTitle: mockListings[7].title,
    listingSlug: mockListings[7].slug,
    buyerName: 'Jack S.',
    rating: 3,
    body: 'Laptop works fine but the box had clearly been opened before. Would have liked a heads up.',
    createdAt: iso(-15),
    adminResponse: {
      body: 'Sorry about that Jack — our packaging process has been tightened since. Do get in touch if anything else comes up.',
      respondedAt: iso(-14),
    },
  },
];

export function mockNotificationsFor(audience: 'buyer' | 'supplier' | 'csr' | 'admin'): AppNotification[] {
  const base: Record<typeof audience, AppNotification[]> = {
    buyer: [
      { id: 'n1', title: 'Your order is on its way', body: `${mockOrders[1].reference} was dispatched with Royal Mail Special Delivery.`, href: `/account/orders/${mockOrders[1].id}`, read: false, createdAt: iso(-0.2), severity: 'INFO' },
      { id: 'n2', title: 'Delivered', body: `${mockOrders[0].reference} was delivered and signed for.`, href: `/account/orders/${mockOrders[0].id}`, read: false, createdAt: iso(-1), severity: 'SUCCESS' },
      { id: 'n3', title: 'How did we do?', body: 'Leave a review for your Apple iPhone 14 Pro.', href: '/account/reviews', read: true, createdAt: iso(-3), severity: 'INFO' },
    ],
    supplier: [
      { id: 'n1', title: 'New order allocated', body: `${mockOrders[2].reference} — confirm within 1 business day.`, href: '/supplier/orders', read: false, createdAt: iso(-0.1), severity: 'WARNING' },
      { id: 'n2', title: 'CSR action required', body: 'A return is in transit for CSR-8102. Respond within 2 business days.', href: '/supplier/csr-notifications', read: false, createdAt: iso(-1), severity: 'ERROR' },
      { id: 'n3', title: 'Payout released', body: '£1,284.50 was released to your bank account.', href: '/supplier/earnings', read: true, createdAt: iso(-5), severity: 'SUCCESS' },
    ],
    csr: [
      { id: 'n1', title: 'New case in the queue', body: 'CSR-8103 — refund request, high priority.', href: '/csr/cases/case_0004', read: false, createdAt: iso(-0.1), severity: 'ERROR' },
      { id: 'n2', title: 'Supplier responded', body: 'Coastal Gadget Traders replied on CSR-8102.', href: '/csr/cases/case_0003', read: false, createdAt: iso(-0.5), severity: 'INFO' },
      { id: 'n3', title: 'SLA approaching', body: 'CSR-8100 first response is due in under 2 hours.', href: '/csr/cases/case_0001', read: true, createdAt: iso(-1), severity: 'WARNING' },
    ],
    admin: [
      { id: 'n1', title: '2 suppliers awaiting approval', body: 'Midlands Mobile Supply and Leeds Electronics Wholesale.', href: '/admin/suppliers?status=PENDING', read: false, createdAt: iso(-0.3), severity: 'WARNING' },
      { id: 'n2', title: 'Case escalated to you', body: 'CSR-8103 was escalated by Sarah Bennett.', href: '/csr/cases/case_0004', read: false, createdAt: iso(-0.6), severity: 'ERROR' },
      { id: 'n3', title: 'Shipment exception', body: `${mockOrders[7].reference} has a delivery exception.`, href: '/admin/orders', read: true, createdAt: iso(-2), severity: 'WARNING' },
    ],
  };
  return base[audience];
}

export const mockEarnings: SupplierEarnings = {
  grossSalesPence: 1_842_400,
  commissionPence: 165_816,
  netEarningsPence: 1_676_584,
  pendingPayoutPence: 284_990,
  payouts: Array.from({ length: 6 }, (_, i) => ({
    id: `pay_${i + 1}`,
    amountPence: 128_450 + i * 31_200,
    status: i === 0 ? 'PENDING' : i === 1 ? 'IN_TRANSIT' : 'PAID',
    periodStart: iso(-(30 + i * 30)),
    periodEnd: iso(-(i * 30)),
    releasedAt: i < 2 ? null : iso(-(i * 30 - 2)),
  })),
};

export const mockCommissionRules: CommissionRule[] = (
  ['mobile-phones', 'tablets', 'laptops', 'smartwatches', 'accessories'] as CategorySlug[]
).flatMap((category, ci) =>
  (['BRONZE', 'SILVER', 'GOLD', 'PREMIUM'] as const).map((tier, ti) => ({
    id: `com_${ci}_${ti}`,
    category,
    tier,
    ratePercent: 15 - ti * 2 - (category === 'accessories' ? 2 : 0),
  })),
);

export const mockAdminSummary = {
  grossRevenuePence: { today: 428_900, week: 2_184_500, month: 8_942_300 },
  commissionPence: { today: 38_601, week: 196_605, month: 804_807 },
  pendingSupplierApprovals: 2,
  openCsrCases: 3,
  activeListings: mockListings.filter((l) => l.status === 'PUBLISHED').length,
  ordersToday: 14,
  ordersThisWeek: 78,
  flaggedShipments: 1,
  revenueSeries: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(now() - (29 - i) * DAY).toISOString().slice(0, 10),
    grossPence: 180_000 + Math.round(Math.sin(i / 3) * 60_000) + i * 3_400,
    commissionPence: 16_200 + Math.round(Math.sin(i / 3) * 5_400) + i * 306,
  })),
};

export const mockCsrSummary = {
  openCases: mockCases.filter((c) => c.status === 'OPEN').length,
  inProgress: mockCases.filter((c) => c.status === 'IN_PROGRESS').length,
  awaitingSupplier: mockCases.filter((c) => c.status === 'AWAITING_SUPPLIER_ACTION').length,
  resolvedToday: 4,
  avgResponseHours: 5.2,
};

export const mockSupplierSummary = {
  totalStockUnits: mockCurrentSupplier.totalStockUnits,
  activeSubmissions: mockStock.filter((s) => s.status === 'ACTIVE').length,
  pendingOrders: mockSupplierOrders.filter((o) => o.status === 'PLACED').length,
  completedOrders: mockSupplierOrders.filter((o) => o.status === 'COMPLETED').length,
  totalEarningsPence: mockEarnings.netEarningsPence,
  tier: mockCurrentSupplier.tier,
  unreadCsrNotifications: mockSupplierCsrNotifications.filter((n) => n.status === 'ACTION_REQUIRED').length,
};
