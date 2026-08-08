import { useEffect, useState } from 'react'
import { getProfile, uploadAvatar, type Profile as ProfileData } from '../../api/profile'
import { useAuth } from '../../auth/AuthContext'
import ProfileSidebar from './ProfileSidebar'
import EditProfileTab from './EditProfileTab'
import SavedTab from './SavedTripsTab'
import LikedTab from './LikedTripsTab'
import LeaderboardTab from './LeaderboardTab'

type TabKey = 'edit' | 'saved' | 'liked' | 'leaderboard'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'edit', label: 'Edit' },
  { key: 'saved', label: 'Saved' },
  { key: 'liked', label: 'Liked' },
  { key: 'leaderboard', label: 'Leaderboard' },
]

function tabClass(active: boolean) {
  return [
    'rounded-full px-4 py-2 text-sm font-medium transition-colors',
    active
      ? 'bg-brand-600 text-white'
      : 'text-slate-600 hover:bg-slate-100',
  ].join(' ')
}

function Profile() {
  const { setProfile: setNavProfile } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabKey>('edit')

  async function refresh() {
    setLoading(true)
    try {
      const data = await getProfile()
      setProfile(data)
      setNavProfile(data)
      setLoadError(null)
    } catch {
      setLoadError('Could not load your profile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  async function handleAvatarUpload(file: File) {
    const updated = await uploadAvatar(file)
    setProfile(updated)
    setNavProfile(updated)
  }

  function handleSaved(updated: ProfileData) {
    setProfile(updated)
    setNavProfile(updated)
  }

  if (loading) {
    return <p className="text-slate-500">Loading profile…</p>
  }

  if (!profile) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError ?? 'Could not load your profile.'}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-8 md:flex-row md:items-start">
      <ProfileSidebar profile={profile} onAvatarUpload={handleAvatarUpload} />

      <div className="min-w-0 flex-1">
        <div className="mb-6 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={tabClass(tab === t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'edit' && <EditProfileTab profile={profile} onSaved={handleSaved} />}
        {tab === 'saved' && <SavedTab />}
        {tab === 'liked' && <LikedTab />}
        {tab === 'leaderboard' && <LeaderboardTab />}
      </div>
    </div>
  )
}

export default Profile
