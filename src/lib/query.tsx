import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '@/shared';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry(failureCount, error) {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export { queryClient };

export const queryKeys = {
  me: ['me'] as const,
  notifications: ['notifications'] as const,

  supplier: {
    summary: ['supplier', 'summary'] as const,
    stock: (params?: unknown) => ['supplier', 'stock', params] as const,
    orders: (params?: unknown) => ['supplier', 'orders', params] as const,
    order: (id: string) => ['supplier', 'orders', id] as const,
    csrNotifications: ['supplier', 'csr-notifications'] as const,
    earnings: ['supplier', 'earnings'] as const,
    profile: ['supplier', 'profile'] as const,
    catalogueSearch: (term: string) => ['supplier', 'catalogue-search', term] as const,
  },

  csr: {
    summary: ['csr', 'summary'] as const,
    cases: (params?: unknown) => ['csr', 'cases', params] as const,
    case: (id: string) => ['csr', 'cases', id] as const,
    orders: (params?: unknown) => ['csr', 'orders', params] as const,
  },

  admin: {
    summary: ['admin', 'summary'] as const,
    queues: ['admin', 'queues'] as const,
    catalogue: (params?: unknown) => ['admin', 'catalogue', params] as const,
    listing: (id: string) => ['admin', 'catalogue', id] as const,
    listingStock: (id: string) => ['admin', 'catalogue', id, 'stock'] as const,
    suppliers: (params?: unknown) => ['admin', 'suppliers', params] as const,
    supplier: (id: string) => ['admin', 'suppliers', id] as const,
    orders: (params?: unknown) => ['admin', 'orders', params] as const,
    order: (id: string) => ['admin', 'orders', id] as const,
    buyers: (params?: unknown) => ['admin', 'buyers', params] as const,
    buyer: (id: string) => ['admin', 'buyers', id] as const,
    report: (name: string, params?: unknown) => ['admin', 'reports', name, params] as const,
    settings: (name: string) => ['admin', 'settings', name] as const,
  },
};
