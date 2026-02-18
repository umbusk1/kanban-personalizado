"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type Board = {
  id: string
  name: string
  description: string | null
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

  useEffect(() => {
    fetchData()
  }, [])

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newBoardName,
          description: newBoardDescription,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "Error al crear tablero")
        setCreating(false)
        return
      }

      const newBoard = await response.json()
      
      // Cerrar modal y limpiar
      setShowModal(false)
      setNewBoardName("")
      setNewBoardDescription("")
      setCreating(false)
      
      // Redirigir al nuevo tablero
      router.push(`/board/${newBoard.id}`)
    } catch (error) {
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">
              🎯 KANBAN Personalizado
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm text-red-600 hover:text-red-700"
              >
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
            <h2 className="text-xl font-semibold mb-2">
              Bienvenido, {user?.name || user?.email}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Tus tableros KANBAN
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Nuevo Tablero
          </button>
        </div>

        {/* Lista de Tableros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((board) => (
            <Link
              key={board.id}
              href={`/board/${board.id}`}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold mb-2">{board.name}</h3>
              {board.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {board.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{board._count.columns} columnas</span>
                <span>{board._count.members + 1} miembros</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Propietario: {board.owner.name || board.owner.email}
              </p>
            </Link>
          ))}

          {boards.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 mb-4">
                Aún no tienes tableros
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Crear Primer Tablero
              </button>
            </div>
          )}
        </div>

        {/* Progreso del Proyecto */}
        <div className="mt-12 bg-green-100 dark:bg-green-900 p-6 rounded-lg">
          <p className="text-green-800 dark:text-green-200 font-semibold">
            ✅ Sprint 1 Completado (3/3)
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Infraestructura base funcionando correctamente
          </p>
        </div>
      </div>

      {/* Modal Crear Tablero */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Crear Nuevo Tablero</h2>
            
            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
                <label htmlFor="boardName" className="block text-sm font-medium mb-1">
                  Nombre del Tablero *
                </label>
                <input
                  id="boardName"
                  type="text"
                  required
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Proyecto Marketing 2024"
                />
              </div>

              <div>
                <label htmlFor="boardDescription" className="block text-sm font-medium mb-1">
                  Descripción (opcional)
                </label>
                <textarea
                  id="boardDescription"
                  value={newBoardDescription}
                  onChange={(e) => setNewBoardDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  onClick={() => {
                    setShowModal(false)
                    setNewBoardName("")
                    setNewBoardDescription("")
                    setError("")
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
