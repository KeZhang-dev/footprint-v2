import { apiUrl, authHeaders, handleJson } from './http'

export interface LeaderboardEntry {
  userId: string
  displayName: string
  avatarUrl: string | null
  points: number
  badge: string | null
  rank: number
}

export function getLeaderboard(): Promise<LeaderboardEntry[]> {
  return fetch(apiUrl('/api/leaderboard'), { headers: authHeaders() }).then((res) =>
    handleJson<LeaderboardEntry[]>(res),
  )
}
