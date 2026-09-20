/**
 * Centralised API client.
 *
 * Auth model: the JWT lives in an httpOnly cookie set by the backend, so the
 * client never reads or writes tokens — it only sends credentials and reacts
 * to 401s by attempting a single silent refresh, then handing control to the
 * app's onUnauthorised hook.
 */

export interface ApiClientConfig {
  baseUrl: string;
  /** Serve fixtures instead of hitting the network. */
  useMocks?: boolean;
  /** Called after a refresh attempt fails — apps redirect to login here. */
  onUnauthorised?: () => void;
  /** Extra headers applied to every request (e.g. a CSRF token). */
  getHeaders?: () => Record<string, string>;
  /** Mock resolver, injected by the app so the fixtures stay tree-shakeable. */
  mockResolver?: MockResolver;
}

export type MockResolver = (
  method: HttpMethod,
  path: string,
  body: unknown,
) => Promise<unknown> | unknown;

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface RequestOptions {
  query?: Record<string, unknown>;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Skip the JSON content-type header — used for multipart uploads. */
  raw?: boolean;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string>;

  constructor(
    message: string,
    status: number,
    code = 'UNKNOWN',
    fieldErrors: Record<string, string> = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }
}

function buildQuery(query: Record<string, unknown> | undefined): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      value.filter((v) => v !== undefined && v !== null && v !== '').forEach((v) => params.append(key, String(v)));
    } else {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export class ApiClient {
  private config: ApiClientConfig;
  private refreshInFlight: Promise<boolean> | null = null;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  configure(patch: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  get useMocks(): boolean {
    return Boolean(this.config.useMocks && this.config.mockResolver);
  }

  get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  post<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('POST', path, { ...options, body });
  }

  patch<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PATCH', path, { ...options, body });
  }

  put<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('PUT', path, { ...options, body });
  }

  delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  /** Multipart upload — used for CSR evidence photos and admin product images. */
  async upload<T>(path: string, formData: FormData): Promise<T> {
    return this.request<T>('POST', path, { body: formData, raw: true });
  }

  /** Downloads a CSV export and hands back a Blob for the caller to save. */
  async downloadCsv(path: string, query?: Record<string, unknown>): Promise<Blob> {
    if (this.useMocks) {
      const result = await this.config.mockResolver!('GET', path + buildQuery(query), undefined);
      return new Blob([String(result)], { type: 'text/csv;charset=utf-8;' });
    }
    const response = await fetch(`${this.config.baseUrl}${path}${buildQuery(query)}`, {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'text/csv', ...(this.config.getHeaders?.() ?? {}) },
    });
    if (!response.ok) {
      throw new ApiError('Export failed', response.status);
    }
    return response.blob();
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions,
    isRetry = false,
  ): Promise<T> {
    const url = `${path}${buildQuery(options.query)}`;

    if (this.useMocks) {
      const result = await this.config.mockResolver!(method, url, options.body);
      return result as T;
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(this.config.getHeaders?.() ?? {}),
      ...(options.headers ?? {}),
    };

    let payload: BodyInit | undefined;
    if (options.body instanceof FormData) {
      payload = options.body;
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl}${url}`, {
        method,
        headers,
        body: payload,
        credentials: 'include',
        signal: options.signal,
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw error;
      throw new ApiError(
        'We could not reach the server. Check your connection and try again.',
        0,
        'NETWORK_ERROR',
      );
    }

    // Single silent refresh attempt, then surrender to the app.
    if (response.status === 401 && !isRetry && !path.startsWith('/auth/')) {
      const refreshed = await this.refresh();
      if (refreshed) return this.request<T>(method, path, options, true);
      this.config.onUnauthorised?.();
    }

    if (response.status === 204) return undefined as T;

    const text = await response.text();
    const data = text ? safeJsonParse(text) : undefined;

    if (!response.ok) {
      const body = (data ?? {}) as {
        message?: string;
        code?: string;
        fieldErrors?: Record<string, string>;
      };
      throw new ApiError(
        body.message ?? defaultMessageForStatus(response.status),
        response.status,
        body.code ?? 'API_ERROR',
        body.fieldErrors ?? {},
      );
    }

    return data as T;
  }

  private refresh(): Promise<boolean> {
    // De-duplicate concurrent refreshes so a burst of 401s only refreshes once.
    if (!this.refreshInFlight) {
      this.refreshInFlight = fetch(`${this.config.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
        .then((r) => r.ok)
        .catch(() => false)
        .finally(() => {
          this.refreshInFlight = null;
        });
    }
    return this.refreshInFlight;
  }
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Some of the details provided were not valid.';
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to do that.';
    case 404:
      return 'We could not find what you were looking for.';
    case 409:
      return 'That action conflicts with the current state of this record.';
    case 422:
      return 'Some of the details provided were not valid.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    default:
      return status >= 500
        ? 'Something went wrong at our end. Please try again shortly.'
        : 'Request failed.';
  }
}

/** Human-readable message for any thrown value — used by every error state. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
