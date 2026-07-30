import type { AuthResponse } from '../api/auth'

//这里是定义了一个Session接口，包含了token、userId、email、role和expiresAt等属性，用于表示用户的会话信息。
export interface Session {
  token: string
  userId: string
  email: string
  role: string
  expiresAt: string
}

const STORAGE_KEY = 'footprint.session'
const SESSION_EXPIRED_EVENT = 'footprint:session-expired'

export function loadSession(): Session | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const session = JSON.parse(raw) as Session
      if (new Date(session.expiresAt) <= new Date()) { //这里是检查会话是否过期，如果过期就从localStorage中移除会话信息，并返回null。
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return session
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

//接收登陆成功后API返回的AuthResponse对象，将其转换为Session对象，并将其存储在localStorage中。然后返回该Session对象。
export function saveSession(auth: AuthResponse): Session {
  const session: Session = {
    token: auth.token,
    userId: auth.userId,
    email: auth.email,
    role: auth.role,
    expiresAt: auth.expiresAt,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  return session
}


//清除会话信息，从localStorage中移除存储的会话信息。
export function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Called by API clients when a request proves the current token is no
 * longer valid (e.g. a 401, or a 404 on a "my own resource" endpoint like
 * GET /api/profile — which can only mean the account behind the token is
 * gone). Clears the stored session and notifies the auth store (see
 * authStore.ts) so the app redirects to /login instead of showing a
 * stale-data error.
 */
//这是一个失效会话的函数，当API客户端发现当前token不再有效时调用。它会清除存储的会话信息，并触发一个自定义事件，通知应用程序会话已过期，以便应用程序可以重定向到登录页面。
export function reportSessionExpired() {
  clearSession()
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
}

//告诉别的组件，当会话过期时，应该执行的回调函数。它会在window对象上添加一个事件监听器，当会话过期事件触发时，调用传入的回调函数。返回一个函数，用于移除该事件监听器。
export function onSessionExpired(listener: () => void): () => void {
  window.addEventListener(SESSION_EXPIRED_EVENT, listener)
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, listener)
}
