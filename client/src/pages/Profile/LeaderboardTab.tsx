import { useEffect, useState } from 'react'
import { getLeaderboard, type LeaderboardEntry } from '../../api/leaderboard'
import { apiUrl } from '../../api/http'
import BadgeChip from './BadgeChip'

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

function LeaderboardTab() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getLeaderboard()
      .then((data) => {
        if (!cancelled) {
          setEntries(data)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the leaderboard.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

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

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-500">
          No one has earned points yet — publish a trip to Discover to be
          the first on the board.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Rank</th>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Points</th>
            <th className="px-4 py-3">Badge</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {entries.map((entry) => (
            <tr key={entry.userId}>
              <td className="px-4 py-3 font-medium text-slate-500">
                #{entry.rank}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {entry.avatarUrl ? (
                    <img
                      src={apiUrl(entry.avatarUrl)}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                      {initials(entry.displayName)}
                    </div>
                  )}
                  <span>{entry.displayName}</span>
                </div>
              </td>
              <td className="px-4 py-3">{entry.points}</td>
              <td className="px-4 py-3">
                <BadgeChip badge={entry.badge} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default LeaderboardTab
