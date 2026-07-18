const BASE = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8787'

export interface AuthUser {
  id: string
  email: string
}

export interface SyncPull {
  snapshot: import('../types').LifelogData | null
  updatedAt: number
}

async function req<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, ...rest } = init
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...((rest.headers as Record<string, string>) || {}),
  }
  if (token) headers.authorization = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { ...rest, headers })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body && body.error) || `Request failed (${res.status})`)
  return body as T
}

export function signup(email: string, password: string) {
  return req<{ token: string; user: AuthUser }>('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function login(email: string, password: string) {
  return req<{ token: string; user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function logout(token: string) {
  return req<{ ok: true }>('/api/auth/logout', { method: 'POST', token })
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
