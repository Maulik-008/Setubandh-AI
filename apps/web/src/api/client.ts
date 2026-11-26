import { errorResponseSchema, type SessionResponse } from '@setubandh/shared';

/**
 * The one way the web app talks to the API (requirements §13.2):
 * - the access token lives in memory only, never in storage;
 * - workspace routes get `X-Workspace-Id`;
 * - a 401 triggers one silent refresh through the httpOnly cookie, shared by every caller
 *   that hit the 401 at the same time, then the request is retried once;
 * - errors become `ApiError` with the API's code and plain-language message.
 */

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  /** Field messages the API attached (e.g. PASSWORD_REJECTED). */
  get fields(): Record<string, string> {
    const fields = this.details?.fields;
    return fields && typeof fields === 'object' ? (fields as Record<string, string>) : {};
  }
}

let accessToken: string | null = null;
let workspaceId: string | null = null;
let refreshing: Promise<SessionResponse | null> | null = null;
const signedOutListeners = new Set<() => void>();

export const session = {
  setAccessToken: (token: string | null) => {
    accessToken = token;
  },
  hasAccessToken: () => accessToken !== null,
  setWorkspace: (id: string | null) => {
    workspaceId = id;
  },
  workspace: () => workspaceId,
  /** Called when a refresh fails: the session is over. */
  onSignedOut: (listener: () => void) => {
    signedOutListeners.add(listener);
    return () => signedOutListeners.delete(listener);
  },
};

async function toError(response: Response): Promise<ApiError> {
  const parsed = errorResponseSchema.safeParse(await response.json().catch(() => null));
  if (parsed.success) {
    const { code, message, details } = parsed.data.error;
    return new ApiError(code, message, response.status, details);
  }
  return new ApiError(
    'INTERNAL',
    'Something went wrong on our side. Please try again.',
    response.status,
  );
}

/** Exchange the refresh cookie for a new access token. Concurrent callers share one request. */
export function refreshSession(): Promise<SessionResponse | null> {
  refreshing ??= fetch(`${API_BASE}/v1/auth/refresh`, { method: 'POST', credentials: 'include' })
    .then(async (response) => {
      if (!response.ok) return null;
      const body = (await response.json()) as SessionResponse;
      accessToken = body.accessToken;
      return body;
    })
    .catch(() => null)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Send X-Workspace-Id (default true when a workspace is active). */
  workspace?: boolean;
  signal?: AbortSignal;
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
  retried = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  if (options.workspace !== false && workspaceId) headers['x-workspace-id'] = workspaceId;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'include',
      signal: options.signal,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError(
      'NETWORK',
      'We could not reach Setubandh AI. Check your connection and try again.',
      0,
    );
  }

  if (
    response.status === 401 &&
    accessToken !== null &&
    !retried &&
    !path.startsWith('/v1/auth/')
  ) {
    if (await refreshSession()) return api<T>(path, options, true);
    accessToken = null;
    signedOutListeners.forEach((listener) => listener());
  }
  if (!response.ok) throw await toError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
