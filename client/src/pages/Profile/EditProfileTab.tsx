import { useState } from 'react'
import type { FormEvent } from 'react'
import { updateProfile, type Profile as ProfileData } from '../../api/profile'

const BIO_MAX_LENGTH = 200
const INTERESTS_MAX_LENGTH = 300

interface EditProfileTabProps {
  profile: ProfileData
  onSaved: (profile: ProfileData) => void
}

function EditProfileTab({ profile, onSaved }: EditProfileTabProps) {
  const [displayName, setDisplayName] = useState(profile.displayName)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [interests, setInterests] = useState(profile.interests ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const updated = await updateProfile({
        displayName,
        bio: bio || null,
        interests: interests || null,
      })
      onSaved(updated)
      setError(null)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Display name
        <input
          required
          maxLength={100}
          value={displayName}
          onChange={(e) => {
            setDisplayName(e.target.value)
            setSaved(false)
          }}
          className="rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Bio
        <textarea
          value={bio}
          onChange={(e) => {
            setBio(e.target.value)
            setSaved(false)
          }}
          maxLength={BIO_MAX_LENGTH}
          rows={3}
          placeholder="A little about you…"
          className="rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
        />
        <span className="font-normal text-slate-500">
          {bio.length}/{BIO_MAX_LENGTH}
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Interests
        <input
          value={interests}
          onChange={(e) => {
            setInterests(e.target.value)
            setSaved(false)
          }}
          maxLength={INTERESTS_MAX_LENGTH}
          placeholder="hiking, coffee, photography"
          className="rounded-lg border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
        />
        <span className="font-normal text-slate-500">
          Comma-separated. {interests.length}/{INTERESTS_MAX_LENGTH}
        </span>
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-full bg-brand-600 px-5 py-2 font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && (
          <span className="text-sm font-medium text-brand-700">
            Saved.
          </span>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </form>
  )
}

export default EditProfileTab
