/** Typed access to the Vite environment. */

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

type MockRole = 'supplier' | 'csr' | 'admin';

const rawRole = import.meta.env.VITE_MOCK_ROLE as string | undefined;
const mockRole: MockRole =
  rawRole === 'supplier' || rawRole === 'csr' || rawRole === 'admin' ? rawRole : 'admin';

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1',
  useMocks: bool(import.meta.env.VITE_USE_MOCKS, true),
  mockRole,
  buyerPortalUrl: import.meta.env.VITE_BUYER_PORTAL_URL ?? 'http://localhost:3000',
  stripePublishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? '',
} as const;

export const PORTAL_NAME = 'UsedPhoneDeals Portal';
