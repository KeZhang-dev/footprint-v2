import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getProfile } from '../api/profile'
import type { Profile } from '../api/profile'
import { useAuthStore } from './authStore'

interface AuthContextValue {
  /** The logged-in user's profile (avatar, display name, ...), for things
   * like the nav bar. Null until the initial fetch completes. Pages that
   * edit the profile should call `setProfile` with the fresh result so
   * anything else reading it (the nav bar) stays in sync without a second
   * fetch or a full reload.
   *
   * Session (token, login/register/logout) lives in `authStore.ts`
   * (Zustand), not here — use `useAuthStore()` for that. */
  profile: Profile | null
  setProfile: (profile: Profile) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useAuthStore((state) => state.session)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (!session) {
      setProfile(null)
      return
    }

    let cancelled = false
    getProfile()
      .then((data) => {
        if (!cancelled) setProfile(data)
      })
      .catch(() => {
        // Nav falls back to the session email when profile isn't loaded;
        // nothing else here needs a visible error for this.
      })
    return () => {
      cancelled = true
    }
  }, [session])

  const value = useMemo<AuthContextValue>(
    () => ({ profile, setProfile }),
    [profile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
