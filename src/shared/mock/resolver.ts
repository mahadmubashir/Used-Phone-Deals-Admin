/**
 * Maps method + path to fixture data so both portals run with no backend.
 * Deliberately mirrors the real endpoint shapes — when the API arrives, the
 * only change is flipping USE_MOCKS to false.
 */
import type { HttpMethod, MockResolver } from '../api/client';
import { ApiError } from '../api/client';
import { GRADE_RANK } from '../constants';
import type {
  AuthUser,
  CatalogueListing,
  ConditionGrade,
  Order,
  Paginated,
  Role,
} from '../types';
import {
  mockAdminSummary,
  mockBuyers,
  mockCases,
  mockCommissionRules,
  mockCsrSummary,
  mockCurrentBuyer,
  mockCurrentSupplier,
  mockEarnings,
  mockListings,
  mockNotificationsFor,
  mockOrders,
  mockReviews,
  mockStock,
  mockSupplierCsrNotifications,
  mockSupplierOrders,
  mockSupplierSummary,
  mockSuppliers,
} from './fixtures';

export interface MockResolverOptions {
  /** Which portal is asking — decides the notification feed and "me" user. */
  audience: 'buyer' | 'supplier' | 'csr' | 'admin';
  /** Simulated network latency in ms. */
  latencyMs?: number;
  /** Overrides the signed-in user, e.g. to preview a different role. */
  user?: AuthUser | null;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function paginate<T>(rows: T[], query: URLSearchParams): Paginated<T> {
  const page = Number(query.get('page') ?? 1);
  const pageSize = Number(query.get('pageSize') ?? 12);
  const start = (page - 1) * pageSize;
  return {
    data: rows.slice(start, start + pageSize),
    page,
    pageSize,
    total: rows.length,
    totalPages: Math.max(1, Math.ceil(rows.length / pageSize)),
  };
}

function matchesFilters(listing: CatalogueListing, query: URLSearchParams): boolean {
  const category = query.get('category');
  if (category && listing.category !== category) return false;

  const search = query.get('search')?.toLowerCase();
  if (
    search &&
    ![listing.title, listing.brand, listing.model, listing.description]
      .join(' ')
      .toLowerCase()
      .includes(search)
  ) {
    return false;
  }

  const brands = query.getAll('brand');
  if (brands.length && !brands.includes(listing.brand)) return false;

  const grades = query.getAll('grade') as ConditionGrade[];
  if (grades.length && (!listing.bestAvailableGrade || !grades.includes(listing.bestAvailableGrade))) {
    return false;
  }

  const minPrice = query.get('minPrice');
  const maxPrice = query.get('maxPrice');
  if (minPrice && listing.pricePence < Number(minPrice) * 100) return false;
  if (maxPrice && listing.pricePence > Number(maxPrice) * 100) return false;

  const rating = query.get('rating');
  if (rating && listing.rating < Number(rating)) return false;

  for (const key of ['storage', 'colour', 'networkLockStatus', 'screenSize', 'ram', 'processor', 'operatingSystem', 'compatibility', 'strapMaterial']) {
    const values = query.getAll(key);
    if (!values.length) continue;
    const specValue = String(listing.specs[key] ?? '');
    const normalised =
      key === 'networkLockStatus'
        ? specValue === 'UNLOCKED'
          ? 'Unlocked'
          : 'Locked to carrier'
        : specValue;
    if (!values.includes(normalised)) return false;
  }

  return true;
}

function sortListings(rows: CatalogueListing[], sort: string | null): CatalogueListing[] {
  const sorted = [...rows];
  switch (sort) {
    case 'price_asc':
      return sorted.sort((a, b) => a.pricePence - b.pricePence);
    case 'price_desc':
      return sorted.sort((a, b) => b.pricePence - a.pricePence);
    case 'rating':
      return sorted.sort((a, b) => b.rating - a.rating);
    case 'newest':
    default:
      return sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
}

const MOCK_USERS: Record<MockResolverOptions['audience'], AuthUser> = {
  buyer: {
    id: mockCurrentBuyer.id,
    email: mockCurrentBuyer.email,
    firstName: mockCurrentBuyer.firstName,
    lastName: mockCurrentBuyer.lastName,
    role: 'BUYER' as Role,
    mfaEnabled: false,
    mfaVerified: true,
    status: 'ACTIVE',
    createdAt: mockCurrentBuyer.registeredAt,
  },
  supplier: {
    id: mockCurrentSupplier.id,
    email: mockCurrentSupplier.email,
    firstName: 'Connect',
    lastName: 'Mobile',
    role: 'SUPPLIER',
    mfaEnabled: true,
    mfaVerified: true,
    status: 'ACTIVE',
    createdAt: mockCurrentSupplier.approvedAt ?? mockCurrentSupplier.appliedAt,
  },
  csr: {
    id: 'csr_0001',
    email: 'sarah.bennett@usedphonedeals.com',
    firstName: 'Sarah',
    lastName: 'Bennett',
    role: 'CSR',
    mfaEnabled: false,
    mfaVerified: true,
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 200 * 86_400_000).toISOString(),
  },
  admin: {
    id: 'adm_0001',
    email: 'admin@usedphonedeals.com',
    firstName: 'Ali',
    lastName: 'Shah',
    role: 'SUPER_ADMIN',
    mfaEnabled: false,
    mfaVerified: true,
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 400 * 86_400_000).toISOString(),
  },
};

/** In-memory stores so mock writes persist for the life of the tab. */
const store = {
  wishlist: new Set<string>([mockListings[2].id]),
  notifyMe: new Set<string>(),
  cases: [...mockCases],
  orders: [...mockOrders],
  stock: [...mockStock],
  listings: [...mockListings],
  suppliers: [...mockSuppliers],
  buyers: [...mockBuyers],
  supplierNotifications: [...mockSupplierCsrNotifications],
  notificationsRead: new Set<string>(),
};

export function createMockResolver(options: MockResolverOptions): MockResolver {
  const { audience, latencyMs = 220 } = options;

  return async function resolve(method: HttpMethod, fullPath: string, body: unknown) {
    await delay(latencyMs);

    const [path, queryString = ''] = fullPath.split('?');
    const query = new URLSearchParams(queryString);
    const payload = (body ?? {}) as Record<string, unknown>;

    /* ---------------- auth ---------------- */

    if (path === '/auth/me') {
      const user = options.user ?? MOCK_USERS[audience];
      if (!user) throw new ApiError('Not signed in', 401);
      return user;
    }

    if (path === '/auth/login') {
      const email = String(payload.email ?? '').toLowerCase();
      const role: MockResolverOptions['audience'] = email.includes('admin')
        ? 'admin'
        : email.includes('csr') || email.includes('sarah')
          ? 'csr'
          : email.includes('supplier') || email.includes('connect')
            ? 'supplier'
            : audience;
      const user = MOCK_USERS[role];
      // Suppliers must clear MFA before the session counts as established.
      if (user.role === 'SUPPLIER') {
        return { mfaRequired: true, mfaToken: 'mock-mfa-token' };
      }
      return { mfaRequired: false, user };
    }

    if (path === '/auth/mfa/verify') {
      const code = String(payload.code ?? '');
      if (code !== '123456') {
        throw new ApiError('That code was not recognised. Try again.', 400, 'INVALID_MFA', {
          code: 'Incorrect code',
        });
      }
      return { mfaRequired: false, user: MOCK_USERS.supplier };
    }

    if (path === '/auth/logout' || path === '/auth/refresh') return { ok: true };
    if (path === '/auth/register') return { mfaRequired: false, user: MOCK_USERS.buyer };
    if (path === '/auth/forgot-password' || path === '/auth/reset-password') return { ok: true };
    if (path === '/auth/change-password') return { ok: true };

    /* ---------------- catalogue ---------------- */

    if (path === '/catalogue/featured') return store.listings.filter((l) => l.inStock).slice(0, 4);
    if (path === '/catalogue/recent') return [...store.listings].reverse().slice(0, 8);
    if (path === '/catalogue/facets') {
      return {
        brands: Array.from(new Set(store.listings.map((l) => l.brand))).sort(),
        priceRange: {
          minPence: Math.min(...store.listings.map((l) => l.pricePence)),
          maxPence: Math.max(...store.listings.map((l) => l.pricePence)),
        },
      };
    }

    if (path === '/catalogue' || path === '/catalogue/search') {
      const filtered = store.listings
        .filter((l) => l.status === 'PUBLISHED')
        .filter((l) => matchesFilters(l, query));
      return paginate(sortListings(filtered, query.get('sort')), query);
    }

    if (path.startsWith('/catalogue/id/')) {
      const id = path.split('/').pop()!;
      const listing = store.listings.find((l) => l.id === id);
      if (!listing) throw new ApiError('Listing not found', 404);
      return listing;
    }

    if (path.startsWith('/catalogue/') && path.endsWith('/reviews')) {
      const id = path.split('/')[2];
      return paginate(store.listings.length ? mockReviews.filter((r) => r.listingId === id) : [], query);
    }

    if (path.startsWith('/catalogue/') && path.endsWith('/notify-me')) {
      store.notifyMe.add(path.split('/')[2]);
      return { ok: true };
    }

    if (path.startsWith('/catalogue/') && method === 'GET') {
      const slug = path.split('/')[2];
      const listing = store.listings.find((l) => l.slug === slug);
      if (!listing) throw new ApiError('We could not find that product.', 404);
      return listing;
    }

    /* ---------------- admin catalogue writes ---------------- */

    if (path === '/admin/catalogue' && method === 'GET') {
      const search = query.get('search')?.toLowerCase();
      const rows = store.listings.filter(
        (l) => !search || l.title.toLowerCase().includes(search),
      );
      return paginate(rows, query);
    }

    if (path === '/admin/catalogue' && method === 'POST') {
      const created: CatalogueListing = {
        ...store.listings[0],
        ...(payload as Partial<CatalogueListing>),
        id: `lst_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as CatalogueListing;
      store.listings.unshift(created);
      return created;
    }

    if (path.startsWith('/admin/catalogue/') && path.endsWith('/stock')) {
      const id = path.split('/')[3];
      return store.suppliers.slice(0, 3).map((supplier, index) => ({
        supplierId: supplier.id,
        supplierName: supplier.businessName,
        tier: supplier.tier,
        quantity: 4 + index * 3,
        conditionGrade: (['PREMIUM', 'EXCELLENT', 'GOOD'] as const)[index],
        listingId: id,
      }));
    }

    if (path.startsWith('/admin/catalogue/') && (method === 'PATCH' || method === 'PUT')) {
      const id = path.split('/')[3];
      const index = store.listings.findIndex((l) => l.id === id);
      if (index === -1) throw new ApiError('Listing not found', 404);
      store.listings[index] = {
        ...store.listings[index],
        ...(payload as Partial<CatalogueListing>),
        updatedAt: new Date().toISOString(),
      };
      return store.listings[index];
    }

    if (path.startsWith('/admin/catalogue/') && method === 'DELETE') {
      const id = path.split('/')[3];
      store.listings = store.listings.filter((l) => l.id !== id);
      return undefined;
    }

    /* ---------------- wishlist ---------------- */

    if (path === '/wishlist' && method === 'GET') {
      return store.listings.filter((l) => store.wishlist.has(l.id));
    }
    if (path === '/wishlist' && method === 'POST') {
      store.wishlist.add(String(payload.listingId));
      return { ok: true };
    }
    if (path.startsWith('/wishlist/') && method === 'DELETE') {
      store.wishlist.delete(path.split('/')[2]);
      return { ok: true };
    }

    /* ---------------- orders (buyer) ---------------- */

    if (path === '/orders' && method === 'GET') {
      return paginate(store.orders.slice(0, 6).map(stripSupplier), query);
    }

    if (path.startsWith('/orders/reference/')) {
      const reference = path.split('/')[3];
      const order = store.orders.find((o) => o.reference === reference);
      if (!order) throw new ApiError('Order not found', 404);
      return stripSupplier(order);
    }

    if (path.startsWith('/orders/') && path.endsWith('/tracking')) {
      const id = path.split('/')[2];
      const order = store.orders.find((o) => o.id === id);
      if (!order) throw new ApiError('Order not found', 404);
      return order.shipment;
    }

    if (path.startsWith('/orders/') && path.endsWith('/cancel')) {
      const id = path.split('/')[2];
      const order = store.orders.find((o) => o.id === id);
      if (!order) throw new ApiError('Order not found', 404);
      if (!order.cancellableByBuyer) {
        throw new ApiError('This order has already been dispatched and can no longer be cancelled.', 409);
      }
      order.status = 'CANCELLED';
      order.cancellableByBuyer = false;
      return stripSupplier(order);
    }

    if (path.startsWith('/orders/') && method === 'GET') {
      const id = path.split('/')[2];
      const order = store.orders.find((o) => o.id === id);
      if (!order) throw new ApiError('Order not found', 404);
      return stripSupplier(order);
    }

    /* ---------------- checkout ---------------- */

    if (path === '/checkout/shipping-estimate') return { shippingPence: 0, estimatedDays: 2 };
    if (path === '/checkout/payment-intent') {
      return { clientSecret: 'pi_mock_secret_123', publishableKey: 'pk_test_mock' };
    }
    if (path === '/checkout/paypal/order') return { orderId: 'PAYPAL-MOCK-1' };
    if (path === '/checkout/paypal/capture') return { ok: true };
    if (path === '/checkout/orders' && method === 'POST') {
      const reference = `UPD-${Math.floor(30000 + Math.random() * 9999)}`;
      const created: Order = {
        ...store.orders[0],
        id: `ord_${Date.now()}`,
        reference,
        status: 'PLACED',
        placedAt: new Date().toISOString(),
        confirmedAt: null,
        cancellableByBuyer: true,
        returnEligible: false,
        shipment: { ...store.orders[0].shipment, carrier: null, trackingNumber: null, status: 'AWAITING_DISPATCH', events: [], shippedAt: null, deliveredAt: null },
      };
      store.orders.unshift(created);
      return stripSupplier(created);
    }

    /* ---------------- reviews ---------------- */

    if (path === '/reviews/mine') return mockReviews.slice(0, 2);
    if (path === '/reviews/pending') {
      return store.orders
        .filter((o) => o.status === 'COMPLETED' || o.status === 'DELIVERED')
        .flatMap((o) => o.items.filter((i) => !i.reviewed).map((i) => ({ orderId: o.id, orderReference: o.reference, item: i })))
        .slice(0, 3);
    }
    if (path === '/reviews' && method === 'POST') {
      return { id: `rev_${Date.now()}`, ...payload };
    }
    if (path === '/admin/reviews') return paginate(mockReviews, query);
    if (path.startsWith('/admin/reviews/')) return { ok: true };

    /* ---------------- support / CSR intake ---------------- */

    if (path === '/support/cases' && method === 'POST') {
      const reference = `CSR-${Math.floor(8200 + Math.random() * 799)}`;
      return { reference, status: 'OPEN', raisedAt: new Date().toISOString() };
    }
    if (path === '/support/cases' && method === 'GET') {
      return store.cases.slice(0, 3);
    }
    if (path === '/support/contact' && method === 'POST') {
      return { reference: `CSR-${Math.floor(8300 + Math.random() * 699)}` };
    }
    if (path === '/support/cases/attachments') {
      return { id: `att_${Date.now()}`, url: 'https://placehold.co/400x400/e2e8f0/475569.png?text=Evidence', filename: 'evidence.jpg' };
    }

    /* ---------------- account ---------------- */

    if (path === '/account/profile' && method === 'GET') return mockCurrentBuyer;
    if (path === '/account/profile') return { ...mockCurrentBuyer, ...payload };
    if (path === '/account/addresses' && method === 'GET') {
      return mockCurrentBuyer.defaultAddress ? [{ id: 'addr_1', ...mockCurrentBuyer.defaultAddress, isDefault: true }] : [];
    }
    if (path.startsWith('/account/addresses')) return { ok: true };

    /* ---------------- notifications ---------------- */

    if (path === '/notifications') {
      return mockNotificationsFor(audience).map((n) => ({
        ...n,
        read: n.read || store.notificationsRead.has(n.id),
      }));
    }
    if (path === '/notifications/unread-count') {
      const unread = mockNotificationsFor(audience).filter(
        (n) => !n.read && !store.notificationsRead.has(n.id),
      ).length;
      return { count: unread };
    }
    if (path === '/notifications/read-all') {
      mockNotificationsFor(audience).forEach((n) => store.notificationsRead.add(n.id));
      return { ok: true };
    }
    if (path.startsWith('/notifications/') && path.endsWith('/read')) {
      store.notificationsRead.add(path.split('/')[2]);
      return { ok: true };
    }

    /* ---------------- supplier ---------------- */

    if (path === '/supplier/summary') return mockSupplierSummary;
    if (path === '/supplier/catalogue-search') {
      const search = query.get('search')?.toLowerCase() ?? '';
      return store.listings
        .filter((l) => !search || l.title.toLowerCase().includes(search))
        .slice(0, 8)
        // Suppliers never receive pricing data for catalogue entries.
        .map(({ pricePence: _price, vatScheme: _vat, ...rest }) => rest);
    }
    if (path === '/supplier/stock' && method === 'GET') return paginate(store.stock, query);
    if (path === '/supplier/stock' && method === 'POST') {
      const created = {
        ...store.stock[0],
        ...(payload as Record<string, unknown>),
        id: `stk_${Date.now()}`,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.stock.unshift(created as (typeof store.stock)[number]);
      return created;
    }
    if (path.startsWith('/supplier/stock/') && method === 'PATCH') {
      const id = path.split('/')[3];
      const index = store.stock.findIndex((s) => s.id === id);
      if (index === -1) throw new ApiError('Stock item not found', 404);
      store.stock[index] = { ...store.stock[index], ...(payload as object), updatedAt: new Date().toISOString() };
      return store.stock[index];
    }
    if (path.startsWith('/supplier/stock/') && method === 'DELETE') {
      const id = path.split('/')[3];
      store.stock = store.stock.filter((s) => s.id !== id);
      return undefined;
    }

    if (path === '/supplier/orders') {
      const status = query.get('status');
      const rows = mockSupplierOrders
        .filter((o) => !status || o.status === status)
        .map(stripBuyerAddress);
      return paginate(rows, query);
    }
    if (path.startsWith('/supplier/orders/') && path.endsWith('/confirm')) {
      const id = path.split('/')[3];
      const order = store.orders.find((o) => o.id === id);
      if (order) {
        order.status = 'CONFIRMED';
        order.confirmedAt = new Date().toISOString();
      }
      return order ? stripBuyerAddress(order) : { ok: true };
    }
    if (path.startsWith('/supplier/orders/') && path.endsWith('/ship')) {
      const id = path.split('/')[3];
      const order = store.orders.find((o) => o.id === id);
      if (order) {
        order.status = 'SHIPPED';
        order.shipment = {
          ...order.shipment,
          carrier: payload.carrier as Order['shipment']['carrier'],
          trackingNumber: String(payload.trackingNumber ?? ''),
          status: 'IN_TRANSIT',
          shippedAt: new Date().toISOString(),
        };
      }
      return order ? stripBuyerAddress(order) : { ok: true };
    }
    if (path.startsWith('/supplier/orders/') && method === 'GET') {
      const id = path.split('/')[3];
      const order = mockSupplierOrders.find((o) => o.id === id) ?? store.orders.find((o) => o.id === id);
      if (!order) throw new ApiError('Order not found', 404);
      return stripBuyerAddress(order);
    }

    if (path === '/supplier/csr-notifications') return store.supplierNotifications;
    if (path.startsWith('/supplier/csr-notifications/')) {
      const id = path.split('/')[3];
      const item = store.supplierNotifications.find((n) => n.id === id);
      if (item) {
        item.response = String(payload.response ?? '');
        item.status = 'RESPONDED';
        item.respondedAt = new Date().toISOString();
      }
      return item ?? { ok: true };
    }
    if (path === '/supplier/earnings') return mockEarnings;
    if (path === '/supplier/payouts') return mockEarnings.payouts;
    if (path === '/supplier/profile') return mockCurrentSupplier;
    if (path === '/supplier/stripe/onboarding-link') {
      return { url: 'https://connect.stripe.com/setup/mock' };
    }

    /* ---------------- CSR ---------------- */

    if (path === '/csr/summary') return mockCsrSummary;
    if (path === '/csr/cases' && method === 'GET') {
      const status = query.get('status');
      const type = query.get('type');
      const search = query.get('search')?.toLowerCase();
      const rows = store.cases.filter(
        (c) =>
          (!status || c.status === status) &&
          (!type || c.type === type) &&
          (!search ||
            c.orderReference.toLowerCase().includes(search) ||
            c.buyerEmail.toLowerCase().includes(search) ||
            c.reference.toLowerCase().includes(search)),
      );
      return paginate(rows, query);
    }
    if (path.startsWith('/csr/cases/')) {
      const id = path.split('/')[3];
      const csrCase = store.cases.find((c) => c.id === id);
      if (!csrCase) throw new ApiError('Case not found', 404);

      if (method === 'GET') return csrCase;

      const action = path.split('/')[4];
      const agentName = MOCK_USERS[audience === 'admin' ? 'admin' : 'csr'];
      const agent = `${agentName.firstName} ${agentName.lastName}`;
      const log = (label: string, detail?: string, visibleToBuyer = false) => {
        csrCase.activity.unshift({
          id: `act_${Date.now()}`,
          timestamp: new Date().toISOString(),
          agentName: agent,
          action: label,
          detail,
          visibleToBuyer,
        });
        csrCase.updatedAt = new Date().toISOString();
      };

      switch (action) {
        case 'status':
          csrCase.status = payload.status as typeof csrCase.status;
          log(`Status changed to ${csrCase.status}`);
          break;
        case 'reply':
          log('Replied to buyer', String(payload.message ?? ''), true);
          if (csrCase.status === 'OPEN') csrCase.status = 'IN_PROGRESS';
          break;
        case 'notify-supplier':
          csrCase.status = 'AWAITING_SUPPLIER_ACTION';
          log('Notified supplier', String(payload.message ?? ''));
          break;
        case 'approve':
          log('Return approved', 'Shippo return label generated and emailed to the buyer.', true);
          csrCase.status = 'AWAITING_SUPPLIER_ACTION';
          break;
        case 'reject':
          log('Return rejected', String(payload.reason ?? ''), true);
          csrCase.status = 'RESOLVED';
          break;
        case 'refund':
          log(
            payload.partial ? 'Partial refund issued' : 'Full refund issued',
            `Amount: £${((Number(payload.amountPence) || 0) / 100).toFixed(2)}`,
            true,
          );
          csrCase.status = 'RESOLVED';
          break;
        case 'escalate':
          csrCase.escalatedToAdmin = true;
          log('Escalated to Super Admin', String(payload.note ?? ''));
          break;
        case 'assign':
          csrCase.assignedAgentId = String(payload.agentId ?? 'csr_0001');
          csrCase.assignedAgentName = String(payload.agentName ?? 'Sarah Bennett');
          log(`Assigned to ${csrCase.assignedAgentName}`);
          break;
        default:
          break;
      }
      return csrCase;
    }
    if (path === '/csr/orders') return paginate(store.orders, query);

    /* ---------------- admin ---------------- */

    if (path === '/admin/summary') return mockAdminSummary;
    if (path === '/admin/summary/revenue') return mockAdminSummary.revenueSeries;
    if (path === '/admin/summary/queues') {
      return {
        pendingSupplierApprovals: store.suppliers.filter((s) => s.status === 'PENDING'),
        escalatedCases: store.cases.filter((c) => c.escalatedToAdmin),
        slaBreaches: store.suppliers.filter((s) => s.consecutiveMissedSlas > 0),
        shipmentExceptions: store.orders.filter((o) => o.shipment.status === 'EXCEPTION'),
      };
    }

    if (path === '/admin/suppliers/pending') {
      return store.suppliers.filter((s) => s.status === 'PENDING');
    }
    if (path === '/admin/suppliers' && method === 'GET') {
      const status = query.get('status');
      const tier = query.get('tier');
      const rows = store.suppliers.filter(
        (s) => (!status || s.status === status) && (!tier || s.tier === tier),
      );
      return paginate(rows, query);
    }
    if (path.startsWith('/admin/suppliers/')) {
      const id = path.split('/')[3];
      const supplier = store.suppliers.find((s) => s.id === id);
      if (!supplier) throw new ApiError('Supplier not found', 404);
      const action = path.split('/')[4];
      if (action === 'approve') supplier.status = 'ACTIVE';
      if (action === 'reject') supplier.status = 'REJECTED';
      if (action === 'suspend') supplier.status = 'SUSPENDED';
      if (action === 'reactivate') supplier.status = 'ACTIVE';
      if (action) supplier.note = String(payload.note ?? '');
      return supplier;
    }

    if (path === '/admin/orders' && method === 'GET') {
      const status = query.get('status');
      const supplierId = query.get('supplierId');
      const search = query.get('search')?.toLowerCase();
      const rows = store.orders.filter(
        (o) =>
          (!status || o.status === status) &&
          (!supplierId || o.supplierId === supplierId) &&
          (!search || o.reference.toLowerCase().includes(search) || o.buyerEmail.toLowerCase().includes(search)),
      );
      return paginate(rows, query);
    }
    if (path.startsWith('/admin/orders/')) {
      const id = path.split('/')[3];
      const order = store.orders.find((o) => o.id === id);
      if (!order) throw new ApiError('Order not found', 404);
      const action = path.split('/')[4];
      if (action === 'cancel') order.status = 'CANCELLED';
      if (action === 'mark-delivered') {
        order.status = 'DELIVERED';
        order.shipment.status = 'DELIVERED';
        order.shipment.deliveredAt = new Date().toISOString();
      }
      if (action === 'refund') order.paymentStatus = 'REFUNDED';
      if (action === 'reassign') {
        const next = store.suppliers.find((s) => s.id === payload.supplierId);
        if (next) {
          order.supplierId = next.id;
          order.supplierName = next.businessName;
          order.status = 'PLACED';
        }
      }
      return order;
    }

    if (path === '/admin/buyers' && method === 'GET') {
      const search = query.get('search')?.toLowerCase();
      const rows = store.buyers.filter(
        (b) => !search || `${b.firstName} ${b.lastName} ${b.email}`.toLowerCase().includes(search),
      );
      return paginate(rows, query);
    }
    if (path.startsWith('/admin/buyers/')) {
      const id = path.split('/')[3];
      const buyer = store.buyers.find((b) => b.id === id);
      if (!buyer) throw new ApiError('Buyer not found', 404);
      const action = path.split('/')[4];
      if (action === 'suspend') buyer.status = 'SUSPENDED';
      if (action === 'reactivate') buyer.status = 'ACTIVE';
      if (method === 'GET') {
        return {
          buyer,
          orders: store.orders.filter((o) => o.buyerId === buyer.id),
          reviews: mockReviews.slice(0, 2),
          cases: store.cases.filter((c) => c.buyerId === buyer.id),
        };
      }
      return buyer;
    }

    if (path.startsWith('/admin/reports/') && path.endsWith('/export')) {
      return buildCsvExport(path.split('/')[3]);
    }
    if (path === '/admin/reports/sales') {
      return {
        rows: mockAdminSummary.revenueSeries.slice(-14).map((point) => ({
          date: point.date,
          orders: 8 + (point.grossPence % 7),
          grossPence: point.grossPence,
          returnsPence: Math.round(point.grossPence * 0.04),
          netPence: Math.round(point.grossPence * 0.96),
        })),
      };
    }
    if (path === '/admin/reports/commission') {
      return {
        rows: store.suppliers
          .filter((s) => s.status === 'ACTIVE')
          .map((s) => ({
            supplierId: s.id,
            supplierName: s.businessName,
            tier: s.tier,
            orders: 12 + s.totalStockUnits % 19,
            grossPence: s.totalStockUnits * 4200,
            commissionPence: Math.round(s.totalStockUnits * 4200 * 0.09),
          })),
      };
    }
    if (path === '/admin/reports/supplier-performance') {
      return {
        rows: store.suppliers.map((s) => ({
          supplierId: s.id,
          supplierName: s.businessName,
          orderVolume: 12 + s.totalStockUnits % 23,
          returnRatePercent: Number((4 + (s.totalStockUnits % 5)).toFixed(1)),
          avgRating: Number((4.9 - (s.totalStockUnits % 7) / 10).toFixed(1)),
          slaCompliancePercent: Math.round(s.fulfilmentRate * 100),
        })),
      };
    }

    if (path === '/admin/settings/commission' && method === 'GET') return mockCommissionRules;
    if (path === '/admin/settings/commission') return payload;
    if (path === '/admin/settings/carriers' && method === 'GET') {
      return { enabled: ['RM_SPECIAL_DELIVERY', 'RM_TRACKED_24_SIG', 'DPD_NEXT_DAY', 'UPS_EXPRESS'] };
    }
    if (path === '/admin/settings/carriers') return payload;
    if (path === '/admin/settings/templates' && method === 'GET') {
      return [
        { id: 'tpl_order_placed', name: 'Order placed', subject: 'Your UsedPhoneDeals order {{reference}}', updatedAt: new Date().toISOString() },
        { id: 'tpl_shipped', name: 'Order shipped', subject: 'Your order is on its way', updatedAt: new Date().toISOString() },
        { id: 'tpl_return_approved', name: 'Return approved', subject: 'Your return label is attached', updatedAt: new Date().toISOString() },
        { id: 'tpl_supplier_approved', name: 'Supplier approved', subject: 'Welcome to UsedPhoneDeals', updatedAt: new Date().toISOString() },
      ];
    }
    if (path === '/admin/settings/templates') return payload;
    if (path === '/admin/settings/vat' && method === 'GET') {
      return { defaultScheme: 'MARGIN', ratePercent: 20 };
    }
    if (path === '/admin/settings/vat') return payload;

    throw new ApiError(`No mock handler for ${method} ${path}`, 404, 'MOCK_NOT_FOUND');
  };
}

/**
 * Strips every supplier field before an order reaches the buyer portal.
 * Belt-and-braces: the real API does this too, but a mock that leaked supplier
 * identity would let a buyer-portal bug go unnoticed in development.
 */
function stripSupplier(order: Order): Order {
  const { supplierId: _s, supplierName: _n, commissionPence: _c, ...rest } = order;
  return {
    ...rest,
    items: order.items.map(({ supplierId: _si, supplierName: _sn, ...item }) => item),
  } as Order;
}

/** Suppliers get the delivery postcode only — never the full buyer address. */
function stripBuyerAddress(order: Order): Order {
  return {
    ...order,
    buyerName: 'Customer',
    buyerEmail: '',
    buyerPhone: '',
    deliveryAddress: {
      line1: '',
      city: '',
      postcode: order.deliveryPostcode,
      country: 'United Kingdom',
    },
  };
}

function buildCsvExport(report: string): string {
  switch (report) {
    case 'sales':
      return [
        'Date,Orders,Gross Revenue,Returns,Net Revenue',
        ...mockAdminSummary.revenueSeries
          .slice(-14)
          .map(
            (p) =>
              `${p.date},${8 + (p.grossPence % 7)},${(p.grossPence / 100).toFixed(2)},${((p.grossPence * 0.04) / 100).toFixed(2)},${((p.grossPence * 0.96) / 100).toFixed(2)}`,
          ),
      ].join('\n');
    case 'commission':
      return [
        'Supplier,Tier,Orders,Gross,Commission',
        ...mockSuppliers
          .filter((s) => s.status === 'ACTIVE')
          .map(
            (s) =>
              `"${s.businessName}",${s.tier},${12 + (s.totalStockUnits % 19)},${((s.totalStockUnits * 4200) / 100).toFixed(2)},${((s.totalStockUnits * 4200 * 0.09) / 100).toFixed(2)}`,
          ),
      ].join('\n');
    default:
      return [
        'Supplier,Order Volume,Return Rate %,Avg Rating,SLA Compliance %',
        ...mockSuppliers.map(
          (s) =>
            `"${s.businessName}",${12 + (s.totalStockUnits % 23)},${(4 + (s.totalStockUnits % 5)).toFixed(1)},${(4.9 - (s.totalStockUnits % 7) / 10).toFixed(1)},${Math.round(s.fulfilmentRate * 100)}`,
        ),
      ].join('\n');
  }
}

export { GRADE_RANK };
