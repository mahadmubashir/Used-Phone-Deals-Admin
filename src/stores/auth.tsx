import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import {
  ApiError,
  PORTAL_ROLES,
  canAccess,
  type AuthUser,
  type LoginResponse,
  type PortalSection,
} from '@/shared';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** True only once any required MFA challenge has been cleared. */
  sessionEstablished: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  verifyMfa: (code: string, mfaToken: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  can: (section: PortalSection) => boolean;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        const user = await api.get<AuthUser>(endpoints.auth.me);
        // Hard stop: a buyer session must never resolve inside this portal,
        // even if a valid buyer cookie is presented on this domain.
        if (!PORTAL_ROLES.includes(user.role)) {
          await api.post(endpoints.auth.logout).catch(() => undefined);
          return null;
        }
        return user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60_000,
  });

  const user = data ?? null;

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      loading: isLoading,
      isAuthenticated: Boolean(user),
      // Suppliers must complete MFA; other roles have no MFA in Phase 1.
      sessionEstablished: Boolean(user && (!user.mfaEnabled || user.mfaVerified)),

      async login(email, password) {
        const response = await api.post<LoginResponse>(endpoints.auth.login, { email, password });
        if (response.user) {
          if (!PORTAL_ROLES.includes(response.user.role)) {
            await api.post(endpoints.auth.logout).catch(() => undefined);
            throw new ApiError(
              'This portal is for suppliers and staff only. Please use the main site to sign in.',
              403,
              'WRONG_PORTAL',
            );
          }
          queryClient.setQueryData(queryKeys.me, response.user);
        }
        return response;
      },

      async verifyMfa(code, mfaToken) {
        const response = await api.post<LoginResponse>(endpoints.auth.verifyMfa, { code, mfaToken });
        if (!response.user) throw new ApiError('Verification failed. Please try again.', 400);
        queryClient.setQueryData(queryKeys.me, response.user);
        return response.user;
      },

      async logout() {
        await api.post(endpoints.auth.logout).catch(() => undefined);
        queryClient.setQueryData(queryKeys.me, null);
        queryClient.clear();
      },

      can: (section) => canAccess(user?.role, section),
    }),
    [user, isLoading, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
