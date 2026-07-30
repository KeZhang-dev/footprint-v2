import { useEffect, useState } from 'react'
import { deleteUser, getUsers, type AdminUser } from '../api/admin'
import { useAuthStore } from '../auth/authStore'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function Admin() {
  const session = useAuthStore((state) => state.session)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  function refresh() {
    setLoading(true)
    getUsers()
      .then(setUsers)
      .catch(() => setLoadError('Could not load users.'))
      .finally(() => setLoading(false))
  }

  useEffect(refresh, [])

  async function handleDelete(user: AdminUser) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete ${user.email} and all their data? This cannot be undone.`,
    )
    if (!confirmed) return

    setActionError(null)
    setDeletingId(user.id)
    try {
      await deleteUser(user.id)
      setUsers((current) => current.filter((u) => u.id !== user.id))
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete user.')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return <p className="text-slate-500">Loading users…</p>
  }

  if (loadError) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</p>
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Users</h1>
      {actionError && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Display name</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {users.map((user) => {
              const canDelete = user.role !== 'Admin' && user.id !== session?.userId
              return (
                <tr key={user.id}>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.displayName}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        disabled={deletingId === user.id}
                        className="rounded-full px-3 py-1 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === user.id ? 'Deleting…' : 'Delete'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Admin
