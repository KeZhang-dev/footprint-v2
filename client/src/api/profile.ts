import { authHeaders, handleJson } from './http'
import type { DiscoverTripSummary } from './discover'

export interface Profile {
  email: string
  displayName: string
  bio: string | null
  interests: string | null
  avatarUrl: string | null
}

export interface ProfileInput {
  displayName: string
  bio: string | null
  interests: string | null
}

const BASE_URL = '/api/profile'

// Every endpoint here resolves to "the caller's own profile" (no id in the
// URL), so a 404 can only mean the account behind the token no longer
// exists — safe to treat as an expired session, unlike a by-id lookup.
const SESSION_BOUND = { sessionBound: true }

export function getProfile(): Promise<Profile> {
  return fetch(BASE_URL, { headers: authHeaders() }).then((res) =>
    handleJson<Profile>(res, SESSION_BOUND),
  )
}

export function updateProfile(input: ProfileInput): Promise<Profile> {
  return fetch(BASE_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  }).then((res) => handleJson<Profile>(res, SESSION_BOUND))
}

export function uploadAvatar(file: File): Promise<Profile> {
  const body = new FormData()
  body.append('file', file)

  return fetch(`${BASE_URL}/avatar`, {
    method: 'POST',
    headers: authHeaders(),
    body,
  }).then((res) => handleJson<Profile>(res, SESSION_BOUND))
}

export function getLikedTrips(): Promise<DiscoverTripSummary[]> {
  return fetch(`${BASE_URL}/liked-trips`, { headers: authHeaders() }).then(
    (res) => handleJson<DiscoverTripSummary[]>(res, SESSION_BOUND),
  )
}

export function getSavedTrips(): Promise<DiscoverTripSummary[]> {
  return fetch(`${BASE_URL}/saved-trips`, { headers: authHeaders() }).then(
    (res) => handleJson<DiscoverTripSummary[]>(res, SESSION_BOUND),
  )
}
