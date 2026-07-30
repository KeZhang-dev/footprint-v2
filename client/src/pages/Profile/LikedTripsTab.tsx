import { useEffect, useState } from 'react'
import { getLikedTrips } from '../../api/profile'
import type { DiscoverTripSummary } from '../../api/discover'
import TripCard from '../Discover/TripCard'
import TripModal from '../Discover/TripModal'

function LikedTab() {
  const [items, setItems] = useState<DiscoverTripSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getLikedTrips()
      .then((trips) => {
        if (!cancelled) {
          setItems(trips)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your liked trips.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function handleLikeChange(tripId: number, liked: boolean, likeCount: number) {
    setItems((prev) =>
      liked
        ? prev.map((item) =>
            item.id === tripId ? { ...item, likedByMe: liked, likeCount } : item,
          )
        : prev.filter((item) => item.id !== tripId),
    )
  }

  if (loading) {
    return <p className="text-slate-500">Loading…</p>
  }

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </p>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-500">
          No liked trips yet — like a trip in Discover to see it here.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <TripCard
            key={item.id}
            trip={item}
            onOpen={() => setSelectedTripId(item.id)}
          />
        ))}
      </div>

      {selectedTripId !== null && (
        <TripModal
          tripId={selectedTripId}
          onClose={() => setSelectedTripId(null)}
          onLikeChange={handleLikeChange}
        />
      )}
    </>
  )
}

export default LikedTab
