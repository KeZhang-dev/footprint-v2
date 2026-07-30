import { authHeaders, handleJson } from './http'

export interface AdminUser {
  id: string
  email: string
  displayName: string
  role: string
  createdAt: string
}

export function getUsers(): Promise<AdminUser[]> {
  return fetch('/api/admin/users', { headers: authHeaders() }).then((res) =>
    handleJson<AdminUser[]>(res),
  )
}

export function deleteUser(id: string): Promise<void> {
  return fetch(`/api/admin/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then((res) => handleJson<void>(res))
}
