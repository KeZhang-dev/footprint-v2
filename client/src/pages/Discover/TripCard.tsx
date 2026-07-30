import type { DiscoverTripSummary } from '../../api/discover'

interface TripCardProps {
  trip: DiscoverTripSummary
  onOpen: () => void
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

function TripCard({ trip, onOpen }: TripCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="aspect-square w-full bg-slate-100">
        {trip.coverPhotoUrl ? (
          <img
            src={trip.coverPhotoUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
            No photo
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="truncate text-sm font-semibold">{trip.title}</h3>
        <p className="truncate text-xs text-slate-500">
          {formatDate(trip.startDate)}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <div className="flex min-w-0 items-center gap-1.5">
            {trip.authorAvatarUrl ? (
              <img
                src={trip.authorAvatarUrl}
                alt=""
                className="h-5 w-5 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">
                {initials(trip.authorDisplayName)}
              </div>
            )}
            <span className="truncate text-xs text-slate-600">
              {trip.authorDisplayName}
            </span>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
            ♥ {trip.likeCount}
          </span>
        </div>
      </div>
    </button>
  )
}

export default TripCard
