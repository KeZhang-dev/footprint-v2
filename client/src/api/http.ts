import { useAuthStore } from '../auth/authStore'
import { reportSessionExpired } from '../auth/session'

// Re-exported so existing `import { apiUrl } from './http'` call sites keep
// working. auth.ts imports these from apiBase.ts directly instead of from
// here — see apiBase.ts for why (this module sits in a circular dependency
// with auth.ts via authStore.ts, and auth.ts can't safely get them through
// that cycle).
export { API_BASE_URL, apiUrl } from './apiBase'

export function authHeaders(): HeadersInit {
  const token = useAuthStore.getState().session?.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface HandleJsonOptions {
  /**
   * Treat a 404 as an expired/invalid session rather than "not found."
   * Only correct for endpoints that always resolve to the caller's own
   * resource (e.g. GET /api/profile) — never for endpoints that look up
   * something by id (e.g. GET /api/trips/{id}), where 404 legitimately
   * means "doesn't exist or isn't yours" and must not log the user out.
   */
  sessionBound?: boolean
}

export async function handleJson<T>(
  res: Response,
  options: HandleJsonOptions = {},
): Promise<T> {
  if (res.status === 401 || (res.status === 404 && options.sessionBound)) {
    reportSessionExpired()
    throw new Error('Your session has expired. Please log in again.')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Request failed: ${res.status} ${res.statusText}`)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json() as Promise<T>
}
