import { apiUrl, authHeaders, handleJson } from './http'

export interface DiscoverTripSummary {
  id: number
  title: string
  destination: string
  startDate: string
  endDate: string
  coverPhotoUrl: string | null
  photoUrls: string[]
  authorDisplayName: string
  authorAvatarUrl: string | null
  likeCount: number
  likedByMe: boolean
}

export interface DiscoverFeedResponse {
  items: DiscoverTripSummary[]
  nextCursor: string | null
}

export interface DiscoverTripDetail {
  id: number
  title: string
  destination: string
  notes: string | null
  startDate: string
  endDate: string
  authorDisplayName: string
  authorAvatarUrl: string | null
  photoUrls: string[]
  likeCount: number
  likedByMe: boolean
  favoritedByMe: boolean
}

// Named TripComment, not Comment — the DOM lib already declares a global
// `Comment` interface (document.createComment()), and shadowing it caused a
// real build-breaking collision the last time a local type name matched a
// reserved/global identifier (Profile vs Profile).
export interface TripComment {
  id: number
  text: string
  createdAt: string
  authorDisplayName: string
  authorAvatarUrl: string | null
}

export interface LikeToggleResult {
  liked: boolean
  likeCount: number
}

export interface FavoriteToggleResult {
  favorited: boolean
}

export function getDiscoverFeed(
  cursor?: string | null,
  limit = 20,
): Promise<DiscoverFeedResponse> {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor) params.set('cursor', cursor)

  return fetch(apiUrl(`/api/discover?${params}`), { headers: authHeaders() }).then(
    (res) => handleJson<DiscoverFeedResponse>(res),
  )
}

export function getDiscoverTripDetail(id: number): Promise<DiscoverTripDetail> {
  return fetch(apiUrl(`/api/discover/${id}`), { headers: authHeaders() }).then((res) =>
    handleJson<DiscoverTripDetail>(res),
  )
}

export function likeTrip(tripId: number): Promise<LikeToggleResult> {
  return fetch(apiUrl(`/api/trips/${tripId}/like`), {
    method: 'POST',
    headers: authHeaders(),
  }).then((res) => handleJson<LikeToggleResult>(res))
}

export function unlikeTrip(tripId: number): Promise<LikeToggleResult> {
  return fetch(apiUrl(`/api/trips/${tripId}/like`), {
    method: 'DELETE',
    headers: authHeaders(),
  }).then((res) => handleJson<LikeToggleResult>(res))
}

export function favoriteTrip(tripId: number): Promise<FavoriteToggleResult> {
  return fetch(apiUrl(`/api/trips/${tripId}/favorite`), {
    method: 'POST',
    headers: authHeaders(),
  }).then((res) => handleJson<FavoriteToggleResult>(res))
}

export function unfavoriteTrip(tripId: number): Promise<FavoriteToggleResult> {
  return fetch(apiUrl(`/api/trips/${tripId}/favorite`), {
    method: 'DELETE',
    headers: authHeaders(),
  }).then((res) => handleJson<FavoriteToggleResult>(res))
}

export function getComments(tripId: number): Promise<TripComment[]> {
  return fetch(apiUrl(`/api/trips/${tripId}/comments`), {
    headers: authHeaders(),
  }).then((res) => handleJson<TripComment[]>(res))
}

export function postComment(tripId: number, text: string): Promise<TripComment> {
  return fetch(apiUrl(`/api/trips/${tripId}/comments`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ text }),
  }).then((res) => handleJson<TripComment>(res))
}
