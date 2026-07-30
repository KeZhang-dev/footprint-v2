import { create } from 'zustand'
import * as authApi from '../api/auth'
import { clearSession, loadSession, onSessionExpired, saveSession } from './session'
import type { Session } from './session'

interface AuthStore {
  session: Session | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  session: loadSession(),
  async login(email, password) {
    set({ session: saveSession(await authApi.login(email, password)) })
  },
  async register(email, password) {
    set({ session: saveSession(await authApi.register(email, password)) })
  },
  logout() {
    clearSession()
    set({ session: null })
  },
}))

// Module-level, not a React effect — this store is a singleton for the
// page's whole lifetime, so there's no mount/cleanup cycle to tie this to.
onSessionExpired(() => useAuthStore.setState({ session: null }))
