import { ApiClient, createMockResolver } from '@/shared';
import { env } from './env';

/**
 * The single API client for the supplier/admin portal.
 *
 * Same backend as the buyer portal, same cookie-based session. What differs is
 * the role attached to that session, which decides what the API will return.
 */
export const api = new ApiClient({
  baseUrl: env.apiBaseUrl,
  useMocks: env.useMocks,
  mockResolver: env.useMocks ? createMockResolver({ audience: env.mockRole }) : undefined,
  onUnauthorised: () => {
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  },
});

export { endpoints, ApiError, errorMessage } from '@/shared';
