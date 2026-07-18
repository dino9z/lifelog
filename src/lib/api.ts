// Empty default => relative URLs, so the app works same-origin when the API and
// the static files are served by one host (e.g. behind a TLS reverse proxy).
// Set VITE_API_URL to an absolute origin (e.g. http://localhost:8787) when the
// API is on a different origin (local dev, separate frontend host).
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
export { BASE as API_BASE }

export interface AuthUser {
  id: string
  email: string
  provider?: string
}
export interface AuthResult {
  token: string
  refreshToken: string
  user: AuthUser
  salt: string | null
}
export interface SyncPull {
  snapshot: string | null
  updatedAt: number
}

type RefreshFn = () => Promise<{ token: string; refreshToken: string }>
let refreshHandler: RefreshFn | null = null
export function registerAuthRefresh(fn: RefreshFn) {
  refreshHandler = fn
}

async function req<T>(path: string, init: RequestInit & { token?: string; _noRefresh?: boolean } = {}): Promise<T> {
  const { token, _noRefresh, ...rest } = init
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...((rest.headers as Record<string, string>) || {}),
  }
  if (token) headers.authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...rest, headers })
  // Transparent token refresh on 401 (single retry, no recursion).
  if (res.status === 401 && refreshHandler && token && !_noRefresh) {
    const next = await refreshHandler()
    return req<T>(path, { ...init, token: next.token, _noRefresh: true })
  }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body && body.error) || `Request failed (${res.status})`)
  return body as T
}

export function signup(email: string, password: string) {
  return req<AuthResult>('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) })
}
export function login(email: string, password: string) {
  return req<AuthResult>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
}
export function refreshAuth(refreshToken: string) {
  return req<{ token: string; refreshToken: string }>('/api/auth/refresh', {
    method: 'POST',
    _noRefresh: true,
    body: JSON.stringify({ refreshToken }),
  })
}
export function logout(token: string) {
  return req<{ ok: true }>('/api/auth/logout', { method: 'POST', token })
}
export function getProviders() {
  return req<{ google: boolean; github: boolean }>('/api/auth/providers')
}
export function getMe(token: string) {
  return req<{ user: AuthUser }>('/api/auth/me', { token })
}
export function pullSync(token: string) {
  return req<SyncPull>('/api/sync', { token })
}
export function pushSync(token: string, snapshot: unknown, updatedAt: number) {
  return req<{ ok: true; updatedAt: number }>('/api/sync', {
    method: 'PUT',
    token,
    body: JSON.stringify({ snapshot, updatedAt }),
  })
}
