/**
 * HTTP client for the platform API — admin portal.
 *
 * Token keys are namespaced separately from the storefront's. The two portals
 * are different origins in production, but during development they share a
 * browser, and a buyer session must never be mistaken for a staff one.
 *
 * Two behaviours worth knowing about:
 *
 *  - A 401 triggers one refresh attempt, and the original request is replayed.
 *    Concurrent 401s share a single refresh rather than each firing their own,
 *    which would race and invalidate one another's tokens.
 *  - Errors arrive as { error: { code, message } }; they are rethrown as
 *    ApiError so callers can branch on a code instead of parsing a string.
 */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

const ACCESS_KEY = "upd-admin-access-token";
const REFRESH_KEY = "upd-admin-refresh-token";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const tokens = {
  get access() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  set(access: string | null, refresh?: string | null) {
    if (typeof window === "undefined") return;
    if (access) window.localStorage.setItem(ACCESS_KEY, access);
    else window.localStorage.removeItem(ACCESS_KEY);
    if (refresh !== undefined) {
      if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
      else window.localStorage.removeItem(REFRESH_KEY);
    }
  },
  clear() {
    this.set(null, null);
  },
};

/** In-flight refresh, shared so parallel 401s do not each start their own. */
let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  const token = tokens.refresh;
  if (!token) return false;
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken: token }),
      });
      if (!res.ok) {
        tokens.clear();
        return false;
      }
      const data = await res.json();
      tokens.set(data.accessToken, data.refreshToken ?? token);
      return true;
    } catch {
      return false;
    } finally {
      // Allow a later 401 to trigger a fresh attempt.
      queueMicrotask(() => {
        refreshing = null;
      });
    }
  })();
  return refreshing;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit & { auth?: boolean; retry?: boolean } = {},
): Promise<T> {
  const { auth = false, retry = true, ...rest } = init;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...((rest.headers as Record<string, string>) ?? {}),
  };
  if (auth && tokens.access) headers.authorization = `Bearer ${tokens.access}`;

  const res = await fetch(`${API_BASE}${path}`, { ...rest, headers });

  if (res.status === 401 && auth && retry && (await refreshSession())) {
    return apiFetch<T>(path, { ...init, retry: false });
  }

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = body?.error ?? {};
    throw new ApiError(res.status, err.code ?? "UNKNOWN", err.message ?? "Something went wrong");
  }
  return body as T;
}
