import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  favoriteTrip,
  getDiscoverTripDetail,
  likeTrip,
  unfavoriteTrip,
  unlikeTrip,
  type DiscoverTripDetail,
} from '../../api/discover'
import CommentSection from './CommentSection'
import { apiUrl } from '../../api/http'

interface TripModalProps {
  tripId: number
  onClose: () => void
  onLikeChange: (tripId: number, liked: boolean, likeCount: number) => void
  onFavoriteChange?: (tripId: number, favorited: boolean) => void
}

function formatDateRange(start: string, end: string) {
  const opts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
  return `${new Date(start).toLocaleDateString(undefined, opts)} – ${new Date(end).toLocaleDateString(undefined, opts)}`
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

const SWIPE_THRESHOLD_PX = 40

function Carousel({ photoUrls }: { photoUrls: string[] }) {
  const [index, setIndex] = useState(0)
  const startX = useRef<number | null>(null)

  function goTo(next: number) {
    setIndex(Math.max(0, Math.min(photoUrls.length - 1, next)))
  }

  function handlePointerDown(e: ReactPointerEvent) {
    startX.current = e.clientX
  }

  function handlePointerUp(e: ReactPointerEvent) {
    if (startX.current === null) return
    const deltaX = e.clientX - startX.current
    startX.current = null
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return
    goTo(deltaX > 0 ? index - 1 : index + 1)
  }

  if (photoUrls.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center bg-slate-100 text-slate-400">
        No photos
      </div>
    )
  }

  return (
    <div
      className="relative aspect-video touch-pan-y overflow-hidden bg-slate-100 select-none"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <img
        src={photoUrls[index]}
        alt=""
        draggable={false}
        className="h-full w-full object-cover"
      />
      {photoUrls.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            aria-label="Previous photo"
            className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white disabled:opacity-30"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index === photoUrls.length - 1}
            aria-label="Next photo"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white disabled:opacity-30"
          >
            ›
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photoUrls.map((url, i) => (
              <span
                key={url}
                className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function TripModal({ tripId, onClose, onLikeChange, onFavoriteChange }: TripModalProps) {
  const [detail, setDetail] = useState<DiscoverTripDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liking, setLiking] = useState(false)
  const [favoriting, setFavoriting] = useState(false)
  const [showCommentInput, setShowCommentInput] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getDiscoverTripDetail(tripId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load this trip.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tripId])

  async function handleToggleLike() {
    if (!detail || liking) return
    setLiking(true)
    try {
      const result = detail.likedByMe
        ? await unlikeTrip(tripId)
        : await likeTrip(tripId)
      setDetail({ ...detail, likedByMe: result.liked, likeCount: result.likeCount })
      onLikeChange(tripId, result.liked, result.likeCount)
    } catch {
      setError('Could not update like.')
    } finally {
      setLiking(false)
    }
  }

  async function handleToggleFavorite() {
    if (!detail || favoriting) return
    setFavoriting(true)
    try {
      const result = detail.favoritedByMe
        ? await unfavoriteTrip(tripId)
        : await favoriteTrip(tripId)
      setDetail({ ...detail, favoritedByMe: result.favorited })
      onFavoriteChange?.(tripId, result.favorited)
    } catch {
      setError('Could not update favorite.')
    } finally {
      setFavoriting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <p className="p-6 text-slate-500">Loading…</p>
        ) : !detail ? (
          <p className="p-6 text-red-600">
            {error ?? 'Could not load this trip.'}
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
              <div className="flex items-center gap-2">
                {detail.authorAvatarUrl ? (
                  <img
                    src={apiUrl(detail.authorAvatarUrl)}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                    {initials(detail.authorDisplayName)}
                  </div>
                )}
                <span className="text-sm font-medium">
                  {detail.authorDisplayName}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <Carousel photoUrls={detail.photoUrls.map(apiUrl)} />

              <div className="flex flex-col gap-2 p-4">
                <h2 className="text-lg font-semibold">{detail.title}</h2>
                <p className="text-sm text-brand-700">
                  {detail.destination}
                </p>
                <p className="text-sm text-slate-500">
                  {formatDateRange(detail.startDate, detail.endDate)}
                </p>
                {detail.notes && (
                  <p className="text-sm break-words text-slate-600">
                    {detail.notes}
                  </p>
                )}
              </div>

              <CommentSection
                tripId={tripId}
                showInput={showCommentInput}
                onCommentPosted={() => setShowCommentInput(false)}
              />
            </div>

            <div className="flex items-center gap-4 border-t border-slate-200 p-4">
              <button
                type="button"
                onClick={handleToggleLike}
                disabled={liking}
                className={`flex items-center gap-1.5 text-sm font-medium ${
                  detail.likedByMe
                    ? 'text-red-600'
                    : 'text-slate-600'
                }`}
              >
                {detail.likedByMe ? '♥' : '♡'} {detail.likeCount}
              </button>
              <button
                type="button"
                onClick={handleToggleFavorite}
                disabled={favoriting}
                className={`text-sm font-medium ${
                  detail.favoritedByMe
                    ? 'text-amber-600'
                    : 'text-slate-600'
                }`}
              >
                {detail.favoritedByMe ? '★ Saved' : '☆ Save'}
              </button>
              <button
                type="button"
                onClick={() => setShowCommentInput((v) => !v)}
                className="text-sm font-medium text-slate-600"
              >
                💬 Comment
              </button>
            </div>

            {error && (
              <p className="border-t border-slate-200 bg-red-50 px-4 py-2 text-xs text-red-700">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default TripModal
