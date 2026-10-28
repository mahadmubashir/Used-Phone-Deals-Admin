/**
 * Every backend route the frontends call, in one place. When the backend
 * team finalises a path, it changes here and nowhere else.
 */
export const endpoints = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    me: '/auth/me',
    refresh: '/auth/refresh',
    verifyMfa: '/auth/mfa/verify',
    enrolMfa: '/auth/mfa/enrol',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    changePassword: '/auth/change-password',
    oauth: (provider: 'google' | 'apple') => `/auth/oauth/${provider}`,
  },

  catalogue: {
    list: '/catalogue',
    featured: '/catalogue/featured',
    recent: '/catalogue/recent',
    bySlug: (slug: string) => `/catalogue/${slug}`,
    byId: (id: string) => `/catalogue/id/${id}`,
    search: '/catalogue/search',
    facets: '/catalogue/facets',
    notifyMe: (id: string) => `/catalogue/${id}/notify-me`,
    reviews: (id: string) => `/catalogue/${id}/reviews`,
    /** Admin-only writes. */
    create: '/admin/catalogue',
    update: (id: string) => `/admin/catalogue/${id}`,
    remove: (id: string) => `/admin/catalogue/${id}`,
    setStatus: (id: string) => `/admin/catalogue/${id}/status`,
    uploadImage: (id: string) => `/admin/catalogue/${id}/images`,
    removeImage: (id: string, imageId: string) => `/admin/catalogue/${id}/images/${imageId}`,
    stockBreakdown: (id: string) => `/admin/catalogue/${id}/stock`,
  },

  cart: {
    get: '/cart',
    addItem: '/cart/items',
    updateItem: (listingId: string) => `/cart/items/${listingId}`,
    removeItem: (listingId: string) => `/cart/items/${listingId}`,
    clear: '/cart',
  },

  checkout: {
    createPaymentIntent: '/checkout/payment-intent',
    createPaypalOrder: '/checkout/paypal/order',
    capturePaypalOrder: '/checkout/paypal/capture',
    placeOrder: '/checkout/orders',
    shippingEstimate: '/checkout/shipping-estimate',
  },

  orders: {
    /** Buyer scope. */
    mine: '/orders',
    byId: (id: string) => `/orders/${id}`,
    byReference: (reference: string) => `/orders/reference/${reference}`,
    cancel: (id: string) => `/orders/${id}/cancel`,
    tracking: (id: string) => `/orders/${id}/tracking`,
    /** Guest tracking via emailed token — no session required. */
    guestTracking: (reference: string, token: string) =>
      `/orders/guest/${reference}?token=${encodeURIComponent(token)}`,
  },

  wishlist: {
    list: '/wishlist',
    add: '/wishlist',
    remove: (listingId: string) => `/wishlist/${listingId}`,
  },

  reviews: {
    mine: '/reviews/mine',
    create: '/reviews',
    pending: '/reviews/pending',
    adminList: '/admin/reviews',
    adminRespond: (id: string) => `/admin/reviews/${id}/response`,
  },

  support: {
    /** Every buyer-originated message lands in the CSR queue. */
    createCase: '/support/cases',
    myCases: '/support/cases',
    caseByReference: (reference: string) => `/support/cases/${reference}`,
    uploadEvidence: '/support/cases/attachments',
    contact: '/support/contact',
  },

  buyerAccount: {
    profile: '/account/profile',
    addresses: '/account/addresses',
    address: (id: string) => `/account/addresses/${id}`,
  },

  notifications: {
    list: '/notifications',
    unreadCount: '/notifications/unread-count',
    markRead: (id: string) => `/notifications/${id}/read`,
    markAllRead: '/notifications/read-all',
    stream: '/notifications/stream',
  },

  supplier: {
    register: '/supplier/register',
    summary: '/supplier/summary',
    stock: '/supplier/stock',
    stockItem: (id: string) => `/supplier/stock/${id}`,
    submitStock: '/supplier/stock',
    catalogueSearch: '/supplier/catalogue-search',
    orders: '/supplier/orders',
    order: (id: string) => `/supplier/orders/${id}`,
    confirmOrder: (id: string) => `/supplier/orders/${id}/confirm`,
    shipOrder: (id: string) => `/supplier/orders/${id}/ship`,
    orderTracking: (id: string) => `/supplier/orders/${id}/tracking`,
    csrNotifications: '/supplier/csr-notifications',
    respondToCsr: (id: string) => `/supplier/csr-notifications/${id}/respond`,
    earnings: '/supplier/earnings',
    payouts: '/supplier/payouts',
    profile: '/supplier/profile',
    stripeConnectLink: '/supplier/stripe/onboarding-link',
  },

  csr: {
    summary: '/csr/summary',
    cases: '/csr/cases',
    case: (id: string) => `/csr/cases/${id}`,
    updateStatus: (id: string) => `/csr/cases/${id}/status`,
    replyToBuyer: (id: string) => `/csr/cases/${id}/reply`,
    notifySupplier: (id: string) => `/csr/cases/${id}/notify-supplier`,
    approveReturn: (id: string) => `/csr/cases/${id}/return/approve`,
    rejectReturn: (id: string) => `/csr/cases/${id}/return/reject`,
    refund: (id: string) => `/csr/cases/${id}/refund`,
    escalate: (id: string) => `/csr/cases/${id}/escalate`,
    assign: (id: string) => `/csr/cases/${id}/assign`,
    orders: '/csr/orders',
    order: (id: string) => `/csr/orders/${id}`,
  },

  admin: {
    summary: '/admin/summary',
    revenueChart: '/admin/summary/revenue',
    actionQueues: '/admin/summary/queues',
    suppliers: '/admin/suppliers',
    supplier: (id: string) => `/admin/suppliers/${id}`,
    pendingSuppliers: '/admin/suppliers/pending',
    approveSupplier: (id: string) => `/admin/suppliers/${id}/approve`,
    rejectSupplier: (id: string) => `/admin/suppliers/${id}/reject`,
    suspendSupplier: (id: string) => `/admin/suppliers/${id}/suspend`,
    reactivateSupplier: (id: string) => `/admin/suppliers/${id}/reactivate`,
    orders: '/admin/orders',
    order: (id: string) => `/admin/orders/${id}`,
    forceCancelOrder: (id: string) => `/admin/orders/${id}/cancel`,
    markDelivered: (id: string) => `/admin/orders/${id}/mark-delivered`,
    manualRefund: (id: string) => `/admin/orders/${id}/refund`,
    reassignOrder: (id: string) => `/admin/orders/${id}/reassign`,
    buyers: '/admin/buyers',
    buyer: (id: string) => `/admin/buyers/${id}`,
    suspendBuyer: (id: string) => `/admin/buyers/${id}/suspend`,
    reactivateBuyer: (id: string) => `/admin/buyers/${id}/reactivate`,
    reports: {
      sales: '/admin/reports/sales',
      commission: '/admin/reports/commission',
      supplierPerformance: '/admin/reports/supplier-performance',
      export: (report: string) => `/admin/reports/${report}/export`,
    },
    settings: {
      commission: '/admin/settings/commission',
      carriers: '/admin/settings/carriers',
      templates: '/admin/settings/notification-templates',
      vat: '/admin/settings/vat',
    },
  },
} as const;
