import { useEffect, useState } from 'react'
import { getDiscoverFeed, type DiscoverTripSummary } from '../../api/discover'
import TripCard from './TripCard'
import TripModal from './TripModal'

function Discover() {
  const [items, setItems] = useState<DiscoverTripSummary[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null)

  async function loadInitial() {
    setLoading(true)
    try {
      const res = await getDiscoverFeed()
      setItems(res.items)
      setNextCursor(res.nextCursor)
      setError(null)
    } catch {
      setError('Could not load the Discover feed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitial()
  }, [])

  async function loadMore() {
    if (!nextCursor) return
    setLoadingMore(true)
    try {
      const res = await getDiscoverFeed(nextCursor)
      setItems((prev) => [...prev, ...res.items])
      setNextCursor(res.nextCursor)
    } catch {
      setError('Could not load more trips.')
    } finally {
      setLoadingMore(false)
    }
  }

  function handleLikeChange(tripId: number, liked: boolean, likeCount: number) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === tripId ? { ...item, likedByMe: liked, likeCount } : item,
      ),
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
        <p className="text-slate-600">
          Public trips shared by the community.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-slate-500">
          No public trips yet — mark a trip public from Your Trips to be the
          first.
        </p>
      ) : (
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

          {nextCursor && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="mx-auto w-fit rounded-full bg-slate-100 px-5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-60"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </>
      )}

      {selectedTripId !== null && (
        <TripModal
          tripId={selectedTripId}
          onClose={() => setSelectedTripId(null)}
          onLikeChange={handleLikeChange}
        />
      )}
    </div>
  )
}

export default Discover
