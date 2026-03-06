"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import AppHeader from "@/components/AppHeader"
import AppFooter from "@/components/AppFooter"

type Board = {
  id: string
  name: string
  description: string | null
  userRole: "owner" | "member"
  owner: { name: string | null; email: string }
  _count: { columns: number; members: number }
}

type User = {
  email: string
  name: string | null
}

function BoardCard({
  board,
  onEdit,
  onDelete,
}: {
  board: Board
  onEdit: (board: Board) => void
  onDelete: (board: Board) => void
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow relative">
      {/* Botones editar/eliminar — solo para el dueño */}
      {board.userRole === "owner" && (
        <div className="absolute top-4 right-4 flex gap-1">
          <button
            onClick={e => { e.preventDefault(); onEdit(board) }}
            title="Editar tablero"
            className="text-gray-400 hover:text-blue-500 transition-colors p-1 rounded"
          >
            ✏️
          </button>
          <button
            onClick={e => { e.preventDefault(); onDelete(board) }}
            title="Eliminar tablero"
            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
          >
            🗑️
          </button>
        </div>
      )}

      <Link href={`/board/${board.id}`} className="block">
        <div className="flex justify-between items-start mb-2 pr-14">
          <h3 className="text-lg font-semibold">{board.name}</h3>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            board.userRole === "owner"
              ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
              : "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
          }`}>
            {board.userRole === "owner" ? "👑 Dueño" : "🤝 Miembro"}
          </span>
        </div>
        {board.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{board.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{board._count.columns} columnas</span>
          <span>{board._count.members + 1} miembros</span>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {board.userRole === "owner"
            ? "Tú eres el propietario"
            : `Propietario: ${board.owner.name || board.owner.email}`}
        </p>
      </Link>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)

  // Modal crear
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newBoardName, setNewBoardName] = useState("")
  const [newBoardDescription, setNewBoardDescription] = useState("")
  const [error, setError] = useState("")

  // Modal editar
  const [editBoard, setEditBoard] = useState<Board | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState("")

  // Modal eliminar
  const [deleteBoard, setDeleteBoard] = useState<Board | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  const openEdit = (board: Board) => {
    setEditBoard(board)
    setEditName(board.name)
    setEditDescription(board.description || "")
    setEditError("")
  }

  const handleEditBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editBoard) return
    setEditError("")
    setSaving(true)
    try {
      const response = await fetch(`/api/boards/${editBoard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDescription }),
      })
      if (!response.ok) {
        const data = await response.json()
        setEditError(data.error || "Error al guardar")
        setSaving(false)
        return
      }
      // Actualizar la lista local sin recargar
      setBoards(prev => prev.map(b =>
        b.id === editBoard.id
          ? { ...b, name: editName, description: editDescription || null }
          : b
      ))
      setEditBoard(null)
      setSaving(false)
    } catch {
      setEditError("Error al guardar")
      setSaving(false)
    }
  }

  const handleDeleteBoard = async () => {
    if (!deleteBoard) return
    setDeleting(true)
    try {
      const response = await fetch(`/api/boards/${deleteBoard.id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setBoards(prev => prev.filter(b => b.id !== deleteBoard.id))
        setDeleteBoard(null)
      }
    } catch {
      console.error("Error al eliminar")
    } finally {
      setDeleting(false)
    }
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* Bienvenida */}
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
                <BoardCard key={board.id} board={board} onEdit={openEdit} onDelete={setDeleteBoard} />
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
                <BoardCard key={board.id} board={board} onEdit={openEdit} onDelete={setDeleteBoard} />
              ))}
            </div>
          </section>
        )}
      </main>

      <AppFooter />

      {/* Modal Crear Tablero */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Crear Nuevo Tablero</h2>
            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  type="text" required value={newBoardName}
                  onChange={e => setNewBoardName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Proyecto Marketing 2026"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
                <textarea
                  value={newBoardDescription}
                  onChange={e => setNewBoardDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3} placeholder="Describe de qué trata este tablero..."
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
                  type="submit" disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                             disabled:opacity-50 transition-colors"
                >
                  {creating ? "Creando..." : "Crear Tablero"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Tablero */}
      {editBoard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Editar Tablero</h2>
            <form onSubmit={handleEditBoard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input
                  type="text" required value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              {editError && (
                <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{editError}</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditBoard(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                             disabled:opacity-50 transition-colors"
                >
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {deleteBoard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-2">¿Eliminar tablero?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Estás a punto de eliminar <strong>"{deleteBoard.name}"</strong>. Esta acción no se puede deshacer y borrará todas las columnas y tarjetas dentro del tablero.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteBoard(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteBoard} disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700
                           disabled:opacity-50 transition-colors"
              >
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
