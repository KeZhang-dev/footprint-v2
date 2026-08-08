import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { useAuthStore } from './auth/authStore'
import { apiUrl } from './api/http'

function navClass({ isActive }: { isActive: boolean }) {
    return [
        'rounded-full px-4 py-2 text-base font-medium transition-colors',
        isActive
            ? 'bg-brand-600 text-white'
            : 'text-slate-600 hover:bg-slate-100',
    ].join(' ')
}

function initials(name: string) {
    return name.trim().slice(0, 1).toUpperCase() || '?'
}

// Shared page container width — max-width, not a fixed width, so narrower
// viewports just shrink to fit instead of overflowing.
const CONTAINER_WIDTH = 'max-w-[1440px]'

function App() {
    const { profile } = useAuth()
    const { session, logout } = useAuthStore()
    const navigate = useNavigate()

    function handleLogout() {
        logout()
        navigate('/')
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <header className="border-b border-slate-200">
                <div
                    className={`mx-auto flex items-center justify-between px-4 py-4 sm:px-6 ${CONTAINER_WIDTH}`}
                >
                    <Link to={session ? '/discover' : '/'} className="text-lg font-semibold tracking-tight">
                        <img src="/footprint-1.png" className="h-10 w-auto" alt="Footprint logo" />
                    </Link>
                    <nav className="flex items-center gap-2">
                        {session ? (
                            <>
                                <NavLink to="/discover" className={navClass}>
                                    Discover
                                </NavLink>
                                <NavLink to="/trips" className={navClass}>
                                    Trips
                                </NavLink>
                                <NavLink to="/profile" className={navClass}>
                                    Profile
                                </NavLink>
                                {session.role === 'Admin' && (
                                    <NavLink to="/admin" className={navClass}>
                                        Users
                                    </NavLink>
                                )}
                                <span className="flex items-center gap-2 px-2 text-base text-slate-600">
                                    {profile?.avatarUrl ? (
                                        <img
                                            src={apiUrl(profile.avatarUrl)}
                                            alt=""
                                            className="h-7 w-7 rounded-full object-cover"
                                        />
                                    ) : (
                                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                                            {initials(profile?.displayName || session.email)}
                                        </span>
                                    )}
                                    {profile?.displayName || session.email}
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="rounded-full px-4 py-2 text-base font-medium text-slate-600 transition-colors hover:bg-slate-100"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                                    </svg>
                                </button>
                            </>
                        ) : (
                            <>
                                <NavLink to="/login" className={navClass}>
                                    Log in
                                </NavLink>
                                <NavLink to="/register" className={navClass}>
                                    Register
                                </NavLink>
                            </>
                        )}
                    </nav>
                </div>
            </header>
            <main className={`mx-auto px-4 py-8 sm:px-6 ${CONTAINER_WIDTH}`}>
                <Outlet />
            </main>
        </div>
    )
}

export default App
