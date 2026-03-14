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
  inProgress: boolean
  totalCards: number
  col3Cards:  number   // ← NUEVO
  createdAt: string
}

type User = {
  email: string
  name: string | null
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
               'Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ── Agrupa sprints por mes: "Marzo 2026", "Febrero 2026", etc.
function groupByMonth(boards: Board[]): { label: string; items: Board[] }[] {
  const map = new Map<string, Board[]>()
  for (const b of boards) {
    const date  = new Date(b.createdAt)
            // Elimina "de" y capitaliza: "marzo de 2026" → "Marzo 2026"
        const label = `${MESES[date.getMonth()]} ${date.getFullYear()}`
    const key   = `${date.getFullYear()}-${String(date.getMonth()).padStart(2,'0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(b)
  }
  // Ordenar meses de más reciente a más antiguo
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, items]) => {
      const d = new Date(items[0].createdAt)
      return {
        label: `${MESES[d.getMonth()]} ${d.getFullYear()}`,
        items,
      }
    })
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser]       = useState<User | null>(null)
  const [boards, setBoards]   = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Board | null>(null)

  // Acordeón histórico — todos los meses abiertos por defecto
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set())

  // Modal crear
  const [showModal, setShowModal]           = useState(false)
  const [creating, setCreating]             = useState(false)
  const [newName, setNewName]               = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [createError, setCreateError]       = useState("")

  // Edición inline
  const [editing, setEditing]   = useState(false)
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [saving, setSaving]     = useState(false)
  const [editError, setEditError] = useState("")

  // Modal eliminar
  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null)
  const [deleting, setDeleting]         = useState(false)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const res = await fetch("/api/dashboard")
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setBoards(data.boards)
        if (data.boards.length > 0) setSelected(data.boards[0])
        // Histórico: todos los meses cerrados por defecto
        setOpenMonths(new Set())
      }
    } catch (e) {
      console.error("Error fetching data:", e)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (board: Board) => {
    setSelected(board)
    setEditing(false)
    setEditError("")
  }

  const toggleMonth = (key: string) => {
    setOpenMonths(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError("")
    setCreating(true)
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDescription }),
      })
      if (!res.ok) {
        const data = await res.json()
        setCreateError(data.error || "Error al crear sprint")
        setCreating(false)
        return
      }
      const newBoard = await res.json()
      setShowModal(false)
      setNewName("")
      setNewDescription("")
      setCreating(false)
      router.push(`/board/${newBoard.id}`)
    } catch {
      setCreateError("Error al crear sprint")
      setCreating(false)
    }
  }

  const handleStartEdit = () => {
    if (!selected) return
    setEditName(selected.name)
    setEditDesc(selected.description || "")
    setEditing(true)
    setEditError("")
  }

  const handleSaveEdit = async () => {
    if (!selected || !editName.trim()) return
    setSaving(true)
    setEditError("")
    try {
      const res = await fetch(`/api/boards/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDesc }),
      })
      if (!res.ok) {
        const data = await res.json()
        setEditError(data.error || "Error al guardar")
        setSaving(false)
        return
      }
      const updated = { ...selected, name: editName, description: editDesc || null }
      setBoards(prev => prev.map(b => b.id === selected.id ? updated : b))
      setSelected(updated)
      setEditing(false)
    } catch {
      setEditError("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/boards/${deleteTarget.id}`, { method: "DELETE" })
      if (res.ok) {
        const remaining = boards.filter(b => b.id !== deleteTarget.id)
        setBoards(remaining)
        setSelected(remaining[0] || null)
        setDeleteTarget(null)
        setEditing(false)
      }
    } catch {
      console.error("Error al eliminar")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><p>Cargando...</p></div>
  )

  const inProgressSprints = boards.filter(b => b.inProgress)
  const historico         = groupByMonth(boards)

  // Clave de mes para el acordeón
  const monthKey = (b: Board) => {
    const d = new Date(b.createdAt)
    return `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

        {/* Bienvenida + botón nuevo */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold mb-1">
              Bienvenido, {user?.name || user?.email}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {boards.length} sprint{boards.length !== 1 ? "s" : ""} en total
              {inProgressSprints.length > 0 && (
                <span className="ml-2 text-indigo-500 font-medium">
                  · {inProgressSprints.length} en proceso
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
          >
            + Nuevo Sprint
          </button>
        </div>

        {boards.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <p className="text-gray-500 mb-4 text-lg">Aún no tienes sprints</p>
            <button onClick={() => setShowModal(true)}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
              Crear Primer Sprint
            </button>
          </div>
        ) : (
          <div className="flex gap-5 items-start">

            {/* ── Columna izquierda: Sprints en proceso ── */}
            <aside className="flex-shrink-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden self-start">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  🔄 En proceso
                </p>
                <p className="text-xs text-indigo-400 mt-0.5">{inProgressSprints.length} activos</p>
              </div>
              {inProgressSprints.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 px-4">
                  Todos los sprints están completados
                </p>
              ) : (
                <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                  {inProgressSprints.map(board => (
                    <li key={board.id}>
                      <button
                        onClick={() => handleSelect(board)}
                        className={`w-full text-left px-4 py-3 text-sm transition-colors
                          hover:bg-indigo-50 dark:hover:bg-indigo-900/20 ${
                          selected?.id === board.id
                            ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold border-l-4 border-indigo-500"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <span className="block truncate">
                          {board.userRole === "member" && (
                            <span className="text-green-500 mr-1" title={`Invitado por ${board.owner.name || board.owner.email}`}>🤝</span>
                          )}
                          {board.name}
                        </span>
                        <span className="text-xs text-gray-400 font-normal">
                          {board.totalCards === 0
                            ? "Sin tarjetas"
                            : (() => {
                                const pct = Math.round((board.col3Cards / board.totalCards) * 100)
                                return (
                                  <span className="font-medium text-indigo-500">{pct}% listo</span>
                                )
                              })()
                          }
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            {/* ── Panel central ── */}
            <div className="flex-1 min-w-0">
              {selected ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 block mb-2">
                    Sprint
                  </span>

                  {editing ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Nombre *</label>
                        <input type="text" value={editName} autoFocus
                          onChange={e => setEditName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                                     dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-lg font-bold" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Descripción</label>
                        <textarea value={editDesc}
                          onChange={e => setEditDesc(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                                     dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          rows={3} />
                      </div>
                      {editError && <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>}
                      <div className="flex gap-3">
                        <button onClick={() => setEditing(false)}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                     hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                          Cancelar
                        </button>
                        <button onClick={handleSaveEdit} disabled={saving || !editName.trim()}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
                                     disabled:opacity-50 text-sm">
                          {saving ? "Guardando..." : "Guardar"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-4">
                        <h2 className="text-2xl font-bold">{selected.name}</h2>
                        {selected.userRole === "owner" && (
                          <div className="flex gap-2 ml-4">
                            <button onClick={handleStartEdit} title="Editar sprint"
                              className="text-gray-400 hover:text-indigo-500 transition-colors p-1 rounded text-lg">
                              ✏️
                            </button>
                            <button onClick={() => setDeleteTarget(selected)} title="Eliminar sprint"
                              className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded text-lg">
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>

                      {selected.description && (
                        <p className="text-gray-600 dark:text-gray-400 mb-6">{selected.description}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
                        <span>📋 {selected._count.columns} columnas</span>
                        <span>🃏 {selected.totalCards} tarjeta{selected.totalCards !== 1 ? 's' : ''}</span>
                        <span>👥 {selected._count.members + 1} miembro{selected._count.members + 1 !== 1 ? 's' : ''}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          selected.inProgress
                            ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                            : "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                        }`}>
                          {selected.inProgress ? "🔄 En proceso" : "✅ Completado"}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          selected.userRole === "owner"
                            ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        }`}>
                          {selected.userRole === "owner" ? "👑 Dueño" : `🤝 ${selected.owner.name || selected.owner.email}`}
                        </span>
                      </div>

                      <Link href={`/board/${selected.id}`}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700
                                   text-white px-6 py-3 rounded-lg font-medium transition-colors">
                        Abrir Sprint →
                      </Link>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center text-gray-400">
                  Selecciona un sprint de la lista
                </div>
              )}
            </div>

            {/* ── Columna derecha: Histórico ── */}
            <aside className="flex-shrink-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden self-start">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  📚 Histórico
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{boards.length} sprints</p>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {historico.map(group => {
                  // Calcular la clave del mes desde el primer item del grupo
                  const key  = monthKey(group.items[0])
                  const open = openMonths.has(key)
                  return (
                    <div key={key}>
                      {/* Encabezado del mes — acordeón */}
                      <button
                        onClick={() => toggleMonth(key)}
                        className="w-full flex items-center justify-between px-4 py-2.5
                                   text-xs font-semibold text-gray-600 dark:text-gray-300
                                   hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors capitalize"
                      >
                        <span>{group.label}</span>
                        <span className="text-gray-400">{open ? '▾' : '▸'}</span>
                      </button>

                      {/* Items del mes */}
                      {open && (
                        <ul className="bg-gray-50 dark:bg-gray-700/20">
                          {group.items.map(board => (
                            <li key={board.id}>
                              <button
                                onClick={() => handleSelect(board)}
                                className={`w-full text-left px-5 py-2.5 text-sm transition-colors
                                  hover:bg-indigo-50 dark:hover:bg-indigo-900/20 ${
                                  selected?.id === board.id
                                    ? "text-indigo-600 dark:text-indigo-400 font-semibold border-l-4 border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
                                    : "text-gray-600 dark:text-gray-400"
                                }`}
                              >
                                <span className="block truncate">
                                  {board.userRole === "member" && (
                                    <span className="text-green-500 mr-1" title={`Invitado por ${board.owner.name || board.owner.email}`}>🤝</span>
                                  )}
                                  {board.name}
                                </span>
                                <span className="text-xs text-gray-400 font-normal">
                                  {board.inProgress ? "🔄 En proceso" : "✅ Completado"}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
              </div>
            </aside>

          </div>
        )}
      </main>

      <AppFooter />

      {/* Modal Crear Sprint */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Crear Nuevo Sprint</h2>
            <form onSubmit={handleCreateBoard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input type="text" required value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Sprint Marketing Q2 2026" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
                <textarea value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3} placeholder="¿Cuál es el objetivo de este sprint?" />
              </div>
              {createError && (
                <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{createError}</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button"
                  onClick={() => { setShowModal(false); setNewName(""); setNewDescription(""); setCreateError("") }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
                             disabled:opacity-50 transition-colors">
                  {creating ? "Creando..." : "Crear Sprint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-2">¿Eliminar sprint?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Estás a punto de eliminar <strong>"{deleteTarget.name}"</strong>. Esta acción no se puede deshacer y borrará todas las columnas y tarjetas.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700
                           disabled:opacity-50 transition-colors">
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
