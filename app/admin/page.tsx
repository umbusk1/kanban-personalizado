'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type User = {
  id: string
  email: string
  name: string | null
  isAdmin: boolean
  createdAt: string
  _count: {
    ownedBoards: number
    boardMembers: number
  }
}

export default function AdminPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.status === 403) {
        router.push('/dashboard')
        return
      }
      const data = await res.json()
      setUsers(data)
    } catch {
      setError('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAdmin = async (userId: string, currentValue: boolean) => {
    if (!confirm(`¿${currentValue ? 'Quitar' : 'Dar'} permisos de admin a este usuario?`)) return

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAdmin: !currentValue }),
    })

    if (res.ok) fetchUsers()
  }

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`¿Eliminar permanentemente la cuenta de ${email}? Esta acción no se puede deshacer.`)) return

    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    if (res.ok) fetchUsers()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">🛡️ Panel de Administración</h1>
          <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-500">
            ← Volver al Dashboard
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Usuarios registrados ({users.length})
          </h2>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-left">Usuario</th>
                <th className="px-6 py-3 text-left">Tableros</th>
                <th className="px-6 py-3 text-left">Rol</th>
                <th className="px-6 py-3 text-left">Registrado</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {user.name || '—'}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 text-xs">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                    {user._count.ownedBoards} propios · {user._count.boardMembers} como miembro
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.isAdmin
                        ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {user.isAdmin ? '🛡️ Admin' : '👤 Usuario'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-xs">
                    {new Date(user.createdAt).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                        className="text-xs px-3 py-1 rounded-lg border border-purple-300 dark:border-purple-600
                                   text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30
                                   transition-colors"
                      >
                        {user.isAdmin ? 'Quitar admin' : 'Hacer admin'}
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.email)}
                        className="text-xs px-3 py-1 rounded-lg border border-red-300 dark:border-red-600
                                   text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30
                                   transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
