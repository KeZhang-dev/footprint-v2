import { apiUrl } from './http'

export interface AuthResponse {
  token: string
  userId: string
  email: string
  role: string
  expiresAt: string
}

const BASE_URL = apiUrl('/api/auth')

async function handle(res: Response): Promise<AuthResponse> {
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Invalid email or password.')
    }
    if (res.status === 409) {
      throw new Error('An account with this email already exists.')
    }
    throw new Error(`Request failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<AuthResponse>
}

export function register(email: string, password: string): Promise<AuthResponse> {
  const url = `${BASE_URL}/register`
  // TEMPORARY - remove after confirming the runtime URL in production.
  console.log('REGISTER FETCH URL:', url)
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then(handle)
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }).then(handle)
}
