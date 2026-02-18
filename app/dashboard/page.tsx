"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type Board = {
  id: string
  name: string
  description: string | null
  userRole: "owner" | "member"
  owner: {
    name: string | null
    email: string
  }
  _count: {
    columns: number
    members: number
  }
}

type User = {
  email: string
  name: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newBoardName, setNewBoardName] = useState("")
  const [newBoardDescription, setNewBoardDescription] = useState("")
  const [error, setError] = useState("")

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const response = await fetch("/api/dashboard")
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setBoards(data.boards)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setCreating(true)

    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBoardName, description: newBoardDescription }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Error al crear tablero")
        setCreating(false)
        return
      }

      const newBoard = await response.json()
      setShowModal(false)
      setNewBoardName("")
      setNewBoardDescription("")
      setCreating(false)
      router.push(`/board/${newBoard.id}`)
    } catch {
      setError("Error al crear tablero")
      setCreating(false)
    }
  }

  const handleSignOut = async () => {
    await fetch("/api/auth/signout", { method: "POST" })
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  const myBoards = boards.filter(b => b.userRole === "owner")
  const sharedBoards = boards.filter(b => b.userRole === "member")

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">🎯 KANBAN Personalizado</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</span>
              <button onClick={handleSignOut} className="text-sm text-red-600 hover:text-red-700">
                Salir
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold mb-1">
              Bienvenido, {user?.name || user?.email}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {boards.length} tablero{boards.length !== 1 ? "s" : ""} en total
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Nuevo Tablero
          </button>
        </div>

        {/* Mis Tableros */}
        <section className="mb-10">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            👑 Mis Tableros ({myBoards.length})
          </h3>
          {myBoards.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <p className="text-gray-500 mb-4">Aún no tienes tableros propios</p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Crear Primer Tablero
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myBoards.map(board => (
                <BoardCard key={board.id} board={board} />
              ))}
            </div>
          )}
        </section>

        {/* Tableros Compartidos */}
        {sharedBoards.length > 0 && (
          <section className="mb-10">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              🤝 Compartidos Conmigo ({sharedBoards.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sharedBoards.map(board => (
                <BoardCard key={board.id} board={board} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Modal Crear Tablero */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Crear Nuevo Tablero</h2>
            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={newBoardName}
                  onChange={e => setNewBoardName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Proyecto Marketing 2025"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
                <textarea
                  value={newBoardDescription}
                  onChange={e => setNewBoardDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe de qué trata este tablero..."
                />
              </div>
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setNewBoardName(""); setNewBoardDescription(""); setError("") }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                             disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? "Creando..." : "Crear Tablero"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
