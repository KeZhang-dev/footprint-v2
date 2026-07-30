import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  createTrip,
  deletePhoto,
  deleteTrip,
  getTrips,
  updateTrip,
  uploadPhotos,
  type Trip,
  type TripInput,
} from '../api/trips'

const emptyForm: TripInput = {
  title: '',
  destination: '',
  startDate: '',
  endDate: '',
  notes: '',
  isPublic: false,
}

function toDateInput(value: string) {
  return value ? value.slice(0, 10) : ''
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function validatePhotoFiles(files: File[]): string | null {
  for (const file of files) {
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      return `${file.name} must be a JPG or PNG image.`
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return `${file.name} exceeds the 2MB size limit.`
    }
  }
  return null
}

function Trips() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<TripInput>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    setLoading(true)
    try {
      setTrips(await getTrips())
      setError(null)
    } catch {
      setError('Could not load trips. Is the API running?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  function startEdit(trip: Trip) {
    setEditingId(trip.id)
    setForm({
      title: trip.title,
      destination: trip.destination,
      startDate: toDateInput(trip.startDate),
      endDate: toDateInput(trip.endDate),
      notes: trip.notes ?? '',
      isPublic: trip.isPublic,
    })
    clearPhotoSelection()
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyForm)
    clearPhotoSelection()
  }

  function clearPhotoSelection() {
    setPhotoFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handlePhotoSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const validationError = validatePhotoFiles(files)
    if (validationError) {
      setError(validationError)
      clearPhotoSelection()
      return
    }
    setError(null)
    setPhotoFiles(files)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const tripId = editingId ?? (await createTrip(form)).id
      if (editingId !== null) {
        await updateTrip(editingId, form)
      }
      if (photoFiles.length > 0) {
        await uploadPhotos(tripId, photoFiles)
      }
      cancelEdit()
      setError(null)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save trip.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteTrip(id)
      if (editingId === id) cancelEdit()
      await refresh()
    } catch {
      setError('Could not delete trip.')
    }
  }

  async function handleDeletePhoto(tripId: number, photoId: number) {
    try {
      await deletePhoto(tripId, photoId)
      await refresh()
    } catch {
      setError('Could not delete photo.')
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your Trips</h1>
        <p className="text-slate-600">
          {editingId !== null
            ? 'Editing a trip below.'
            : 'Log a new trip and keep your journal up to date.'}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2"
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          Title
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
            placeholder="Summer in Kyoto"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Destination
          <input
            required
            value={form.destination}
            onChange={(e) =>
              setForm({ ...form, destination: e.target.value })
            }
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
            placeholder="Kyoto, Japan"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Start date
          <input
            required
            type="date"
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          End date
          <input
            required
            type="date"
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Description
          <textarea
            value={form.notes ?? ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
            rows={3}
            placeholder="Highlights, things to remember..."
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Photos
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png"
            onChange={handlePhotoSelect}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700"
          />
          <span className="font-normal text-slate-500">
            JPG or PNG, up to 2MB each.
            {photoFiles.length > 0 &&
              ` ${photoFiles.length} file${photoFiles.length === 1 ? '' : 's'} selected.`}
          </span>
        </label>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isPublic}
              onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Make this trip public (visible to everyone on Discover)
          </label>
          <span className="pl-6 text-sm font-normal text-slate-500">
            Public trips appear in Discover for all users to see.
          </span>
        </div>
        <div className="flex gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-brand-600 px-5 py-2 font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {saving
              ? 'Saving…'
              : editingId !== null
                ? 'Save changes'
                : 'Add trip'}
          </button>
          {editingId !== null && (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-full px-5 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-slate-500">Loading trips…</p>
      ) : trips.length === 0 ? (
        <p className="text-slate-500">No trips yet — add your first above.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => (
            <li
              key={trip.id}
              className="flex min-w-0 flex-col gap-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-semibold">{trip.title}</h2>
                {trip.isPublic && (
                  <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                    Public
                  </span>
                )}
              </div>
              <p className="truncate text-sm text-brand-700">
                {trip.destination}
              </p>
              <p className="text-sm text-slate-500">
                {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
              </p>
              {trip.notes && (
                <p className="line-clamp-3 text-sm break-words text-slate-600">
                  {trip.notes}
                </p>
              )}
              {trip.photos.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {trip.photos.map((photo) => (
                    <div key={photo.id} className="group relative">
                      <img
                        src={photo.url}
                        alt=""
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(trip.id, photo.id)}
                        aria-label="Delete photo"
                        className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/80 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-auto flex gap-3 pt-3 text-sm font-medium">
                <button
                  onClick={() => startEdit(trip)}
                  className="text-brand-700 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(trip.id)}
                  className="text-red-600 hover:underline"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Trips
