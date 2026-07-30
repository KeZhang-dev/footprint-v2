import { authHeaders, handleJson } from './http'

export interface TripPhoto {
  id: number
  tripId: number
  fileName: string
  uploadedAt: string
  url: string
}

export interface Trip {
  id: number
  title: string
  destination: string
  startDate: string
  endDate: string
  notes: string | null
  createdAt: string
  isPublic: boolean
  photos: TripPhoto[]
}

export type TripInput = Omit<Trip, 'id' | 'createdAt' | 'photos'>

const BASE_URL = '/api/trips'

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024
export const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png']

export function getTrips(): Promise<Trip[]> {
  return fetch(BASE_URL, { headers: authHeaders() }).then((res) =>
    handleJson<Trip[]>(res),
  )
}

export function getTrip(id: number): Promise<Trip> {
  return fetch(`${BASE_URL}/${id}`, { headers: authHeaders() }).then((res) =>
    handleJson<Trip>(res),
  )
}

export function createTrip(trip: TripInput): Promise<Trip> {
  return fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(trip),
  }).then((res) => handleJson<Trip>(res))
}

export function updateTrip(id: number, trip: TripInput): Promise<void> {
  return fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(trip),
  }).then((res) => handleJson<void>(res))
}

export function deleteTrip(id: number): Promise<void> {
  return fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then((res) => handleJson<void>(res))
}

export function uploadPhotos(
  tripId: number,
  files: File[],
): Promise<TripPhoto[]> {
  const body = new FormData()
  for (const file of files) {
    body.append('files', file)
  }

  return fetch(`${BASE_URL}/${tripId}/photos`, {
    method: 'POST',
    headers: authHeaders(),
    body,
  }).then((res) => handleJson<TripPhoto[]>(res))
}

export function deletePhoto(tripId: number, photoId: number): Promise<void> {
  return fetch(`${BASE_URL}/${tripId}/photos/${photoId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then((res) => handleJson<void>(res))
}
