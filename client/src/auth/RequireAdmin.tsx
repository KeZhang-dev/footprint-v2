import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from './authStore'

function RequireAdmin({ children }: { children: ReactNode }) {
  const session = useAuthStore((state) => state.session)
  const location = useLocation()

  if (!session) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (session.role !== 'Admin') {
    return <Navigate to="/" replace />
  }

  return children
}

export default RequireAdmin
