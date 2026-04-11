'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppHeader from '@/components/AppHeader'
import AppFooter from '@/components/AppFooter'

type User = {
  id: string
  email: string
  name: string | null
  isAdmin: boolean
  createdAt: string
  _count: { ownedBoards: number; boardMembers: number }
}

type Survey = {
  id: string
  email: string
  wantsMore: boolean
  bonsaisPerWeek: number | null
  sprintsPerWeek: number | null
  createdAt: string
}

type SurveyData = {
  surveys: Survey[]
  total: number
  wantsMore: number
  noMore: number
  bonsaiCounts: Record<number, number>
  sprintCounts: Record<number, number>
}

type Tab = "users" | "surveys"

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab]           = useState<Tab>("users")
  const [users, setUsers]       = useState<User[]>([])
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => { fetchUsers() }, [])

  useEffect(() => {
    if (tab === "surveys" && !surveyData) fetchSurveys()
  }, [tab])

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users')
      if (res.status === 401 || res.status === 403) { router.push('/dashboard'); return }
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch {
      setError('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const fetchSurveys = async () => {
    try {
      const res = await fetch('/api/admin/surveys')
      if (res.ok) setSurveyData(await res.json())
    } catch {
      setError('Error al cargar encuestas')
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
    if (!confirm(`¿Eliminar permanentemente la cuenta de ${email}?`)) return
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    if (res.ok) fetchUsers()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><p>Cargando...</p></div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <AppHeader />
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* Cabecera */}
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🛡️ Panel de Administración</h1>
          <Link href="/dashboard" className="text-sm text-blue-600 hover:text-blue-500">← Volver al Dashboard</Link>
        </div>

        {/* Pestañas */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button onClick={() => setTab("users")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === "users"
                ? "bg-white dark:bg-gray-800 border border-b-white dark:border-gray-700 dark:border-b-gray-800 text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}>
            👤 Usuarios ({users.length})
          </button>
          <button onClick={() => setTab("surveys")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === "surveys"
                ? "bg-white dark:bg-gray-800 border border-b-white dark:border-gray-700 dark:border-b-gray-800 text-indigo-600 dark:text-indigo-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}>
            📊 Encuestas de cupo {surveyData ? `(${surveyData.total})` : ""}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-600 p-4 rounded-lg mb-6">{error}</div>
        )}

        {/* ── Tab: Usuarios ── */}
        {tab === "users" && (
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
                      <div className="font-medium text-gray-900 dark:text-white">{user.name || '—'}</div>
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
                        <button onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                          className="text-xs px-3 py-1 rounded-lg border border-purple-300 dark:border-purple-600
                                     text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors">
                          {user.isAdmin ? 'Quitar admin' : 'Hacer admin'}
                        </button>
                        <button onClick={() => handleDelete(user.id, user.email)}
                          className="text-xs px-3 py-1 rounded-lg border border-red-300 dark:border-red-600
                                     text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab: Encuestas ── */}
        {tab === "surveys" && (
          <div className="space-y-6">

            {!surveyData ? (
              <p className="text-gray-500 text-sm">Cargando encuestas...</p>
            ) : surveyData.total === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center">
                <p className="text-gray-400">Aún no hay respuestas de encuesta.</p>
                <p className="text-gray-400 text-sm mt-1">Aparecen cuando un usuario agota su cupo semanal de IA.</p>
              </div>
            ) : (
              <>
                {/* Resumen agregado */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 text-center">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{surveyData.total}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Respuestas totales</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 text-center">
                    <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{surveyData.wantsMore}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Quieren más cupo</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 text-center">
                    <p className="text-3xl font-bold text-gray-500">{surveyData.noMore}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">No necesitan más</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 text-center">
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {surveyData.total > 0 ? Math.round((surveyData.wantsMore / surveyData.total) * 100) : 0}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tasa de interés</p>
                  </div>
                </div>

                {/* Preferencias de volumen */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                      🌳 Bonsais por semana — preferencias
                    </h3>
                    <div className="space-y-2">
                      {[2, 4, 6, 8].map(n => {
                        const count = surveyData.bonsaiCounts[n] || 0
                        const pct = surveyData.wantsMore > 0 ? Math.round((count / surveyData.wantsMore) * 100) : 0
                        return (
                          <div key={n} className="flex items-center gap-3">
                            <span className="text-sm text-gray-500 w-6">{n}</span>
                            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                              <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 w-12 text-right">{count} ({pct}%)</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                      🌿 Sprints por semana — preferencias
                    </h3>
                    <div className="space-y-2">
                      {[6, 9, 12, 15].map(n => {
                        const count = surveyData.sprintCounts[n] || 0
                        const pct = surveyData.wantsMore > 0 ? Math.round((count / surveyData.wantsMore) * 100) : 0
                        return (
                          <div key={n} className="flex items-center gap-3">
                            <span className="text-sm text-gray-500 w-6">{n}</span>
                            <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                              <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 w-12 text-right">{count} ({pct}%)</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Tabla de respuestas individuales */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                  <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Respuestas individuales
                    </p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs">
                      <tr>
                        <th className="px-6 py-3 text-left">Usuario</th>
                        <th className="px-6 py-3 text-left">¿Quiere más?</th>
                        <th className="px-6 py-3 text-left">Bonsais/sem</th>
                        <th className="px-6 py-3 text-left">Sprints/sem</th>
                        <th className="px-6 py-3 text-left">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {surveyData.surveys.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                          <td className="px-6 py-3 text-gray-700 dark:text-gray-300 text-xs">{s.email}</td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              s.wantsMore
                                ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                            }`}>
                              {s.wantsMore ? "Sí" : "No"}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-gray-500 dark:text-gray-400 text-sm">
                            {s.bonsaisPerWeek ?? "—"}
                          </td>
                          <td className="px-6 py-3 text-gray-500 dark:text-gray-400 text-sm">
                            {s.sprintsPerWeek ?? "—"}
                          </td>
                          <td className="px-6 py-3 text-gray-400 text-xs">
                            {new Date(s.createdAt).toLocaleDateString('es-ES')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  )
}
