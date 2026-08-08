import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { Profile as ProfileData } from '../../api/profile'
import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES } from '../../api/trips'
import { apiUrl } from '../../api/http'
import BadgeChip from './BadgeChip'

const IP_LOCATION_PLACEHOLDER = 'Christchurch, NZ'

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || '?'
}

function interestTags(interests: string | null): string[] {
  if (!interests) return []
  return interests
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

interface ProfileSidebarProps {
  profile: ProfileData
  onAvatarUpload: (file: File) => Promise<void>
}

function ProfileSidebar({ profile, onAvatarUpload }: ProfileSidebarProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setError(`${file.name} must be a JPG or PNG image.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError(`${file.name} exceeds the 2MB size limit.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      await onAvatarUpload(file)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload avatar.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const tags = interestTags(profile.interests)

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm md:w-72 md:shrink-0">
      {profile.avatarUrl ? (
        <img
          src={apiUrl(profile.avatarUrl)}
          alt=""
          className="h-28 w-28 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-brand-600 text-4xl font-semibold text-white">
          {initials(profile.displayName)}
        </div>
      )}

      <div>
        <h1 className="text-lg font-semibold">{profile.displayName}</h1>
        <p className="text-sm text-slate-500">{profile.email}</p>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-700">
          {profile.points} {profile.points === 1 ? 'point' : 'points'}
        </span>
        <BadgeChip badge={profile.badge} />
      </div>

      <p className="text-sm text-slate-600">
        {profile.bio || 'No bio yet.'}
      </p>

      <div className="flex flex-wrap justify-center gap-1.5">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
            >
              {tag}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-500">No interests added yet.</span>
        )}
      </div>

      <div className="w-full border-t border-slate-200 pt-4">
        <p className="text-xs font-medium tracking-wide text-slate-400 uppercase">
          IP location
        </p>
        <p className="text-sm text-slate-600">
          {IP_LOCATION_PLACEHOLDER}
        </p>
      </div>

      <label className="w-fit cursor-pointer rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700">
        {uploading ? 'Uploading…' : 'Change avatar'}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleSelect}
          disabled={uploading}
          className="hidden"
        />
      </label>
      <span className="text-xs text-slate-500">JPG or PNG, up to 2MB.</span>

      {error && (
        <p className="w-full rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export default ProfileSidebar
