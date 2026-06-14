"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import AppHeader from "@/components/AppHeader"
import AppFooter from "@/components/AppFooter"
import AgenteSprintModal, { GeneratedBoard, GeneratedBonsai } from "@/components/AgenteSprintModal"
import QuotaSurveyModal from "@/components/QuotaSurveyModal"

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
               'Agosto','Septiembre','Octubre','Noviembre','Diciembre']

type Board = {
  id: string
  name: string
  description: string | null
  userRole: "owner" | "member"
  owner: { name: string | null; email: string }
  _count: { columns: number; members: number }
  inProgress: boolean
  totalCards: number
  col3Cards:  number
  createdAt:  string
  generatedByAI: boolean
  aiPrompt: string | null
}

type User = {
  email: string
  name: string | null
}

function groupByMonth(boards: Board[]): { label: string; items: Board[] }[] {
  const map = new Map<string, Board[]>()
  for (const b of boards) {
    const date = new Date(b.createdAt)
    const key  = `${date.getFullYear()}-${String(date.getMonth()).padStart(2,'0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(b)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([, items]) => {
      const d = new Date(items[0].createdAt)
      return { label: `${MESES[d.getMonth()]} ${d.getFullYear()}`, items }
    })
}

function monthKey(b: Board) {
  const d = new Date(b.createdAt)
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`
}

function PromptViewer({ prompt, onRegenerate }: { prompt: string; onRegenerate: (prompt: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-3 border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium
                   text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
        <span>✨ Ver prompt original</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 bg-purple-50 dark:bg-purple-900/10">
          <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">{prompt}</p>
          <button onClick={() => onRegenerate(prompt)}
            className="mt-2 text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium">
            ✏️ Editar y re-generar →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Tarjeta de sprint para móvil ──
function SprintCard({ board, onEdit, onDelete, onRegenerate }: {
  board: Board
  onEdit: (b: Board) => void
  onDelete: (b: Board) => void
  onRegenerate: (prompt: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const pct = board.totalCards === 0 ? 0 : Math.round((board.col3Cards / board.totalCards) * 100)

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border ${
      board.inProgress ? "border-indigo-200 dark:border-indigo-800" : "border-gray-200 dark:border-gray-700"
    } overflow-hidden`}>
      {/* Cabecera siempre visible */}
      <button onClick={() => setExpanded(e => !e)} className="w-full text-left px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
              {board.generatedByAI && <span className="mr-1 text-xs">✨</span>}
              {board.userRole === "member" && <span className="mr-1 text-green-500">🤝</span>}
              {board.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                board.inProgress
                  ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                  : "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
              }`}>
                {board.inProgress ? "🔄 En proceso" : "✅ Completado"}
              </span>
              {board.totalCards > 0 && (
                <span className="text-xs text-gray-400">{pct}% listo</span>
              )}
            </div>
          </div>
          <span className="text-gray-400 text-sm mt-1">{expanded ? '▾' : '▸'}</span>
        </div>
        {/* Barra de progreso */}
        {board.totalCards > 0 && (
          <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-indigo-500"}`}
              style={{ width: `${pct}%` }} />
          </div>
        )}
      </button>

      {/* Detalle expandido */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-3">
          {board.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{board.description}</p>
          )}
          {board.generatedByAI && board.aiPrompt && (
            <PromptViewer prompt={board.aiPrompt} onRegenerate={onRegenerate} />
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href={`/board/${board.id}`}
              className="flex-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Abrir Sprint →
            </Link>
            {board.userRole === "owner" && (
              <>
                <button onClick={() => onEdit(board)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  ✏️
                </button>
                <button onClick={() => onDelete(board)}
                  className="px-3 py-2 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  🗑️
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser]         = useState<User | null>(null)
  const [boards, setBoards]     = useState<Board[]>([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState<Board | null>(null)
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set())

  // Modal crear
  const [showModal, setShowModal]           = useState(false)
  const [creating, setCreating]             = useState(false)
  const [newName, setNewName]               = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [createError, setCreateError]       = useState("")

  // Edición inline
  const [editing, setEditing]     = useState(false)
  const [editName, setEditName]   = useState("")
  const [editDesc, setEditDesc]   = useState("")
  const [saving, setSaving]       = useState(false)
  const [editError, setEditError] = useState("")

  // Modal eliminar
  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null)
  const [deleting, setDeleting]         = useState(false)

  // Agente Sprint / Bonsai
  const [showAgenteModal, setShowAgenteModal] = useState(false)
  const [generatedBoard, setGeneratedBoard]   = useState<GeneratedBoard | null>(null)
  const [generatedBonsai, setGeneratedBonsai] = useState<GeneratedBonsai | null>(null)
  const [agenteInitialPrompt, setAgenteInitialPrompt] = useState("")
  const [agenteInitialMode, setAgenteInitialMode]     = useState<"sprint" | "bonsai">("sprint")

  // Quota survey
  const [showQuotaModal, setShowQuotaModal] = useState(false)
  const [quotaType, setQuotaType]           = useState<"sprint" | "bonsai">("sprint")

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const res = await fetch("/api/dashboard")
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setBoards(data.boards)
        const inP = data.boards.filter((b: Board) => b.inProgress)
        setSelected(inP.length > 0 ? inP[inP.length - 1] : null)
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
    e.preventDefault(); setCreating(true); setCreateError("")
    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDescription }),
      })
      if (!res.ok) { const d = await res.json(); setCreateError(d.error || "Error al crear"); setCreating(false); return }
      const board = await res.json()
      setShowModal(false); setNewName(""); setNewDescription(""); setCreateError("")
      await fetchData()
      setSelected(board)
    } catch { setCreateError("Error al crear sprint") }
    finally { setCreating(false) }
  }

  const handleStartEdit = (board: Board) => {
    setSelected(board); setEditing(true)
    setEditName(board.name); setEditDesc(board.description || ""); setEditError("")
  }

  const handleSaveEdit = async () => {
    if (!selected || !editName.trim()) return
    setSaving(true); setEditError("")
    try {
      const res = await fetch(`/api/boards/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, description: editDesc }),
      })
      if (!res.ok) { setEditError("Error al guardar"); setSaving(false); return }
      const updated = await res.json()
      setBoards(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b))
      setSelected(updated); setEditing(false)
    } catch { setEditError("Error al guardar") }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/boards/${deleteTarget.id}`, { method: "DELETE" })
      if (res.ok) {
        const remaining = boards.filter(b => b.id !== deleteTarget.id)
        setBoards(remaining)
        const inP = remaining.filter(b => b.inProgress)
        setSelected(inP.length > 0 ? inP[inP.length - 1] : null)
        setDeleteTarget(null); setEditing(false)
      }
    } catch { console.error("Error al eliminar") }
    finally { setDeleting(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><p>Cargando...</p></div>
  )

  const inProgressSprints = boards.filter(b => b.inProgress)
  const historico = groupByMonth(boards.filter(b => !b.inProgress))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="sticky top-0 z-30">
        <AppHeader />
      </div>

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">

        {/* Bienvenida + botones */}
        <div className="mb-5 flex justify-between items-center gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold mb-0.5">
              Bienvenido, {user?.name || user?.email}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
              {boards.length} sprint{boards.length !== 1 ? "s" : ""} en total
              {inProgressSprints.length > 0 && (
                <span className="ml-2 text-indigo-500 font-medium">
                  · {inProgressSprints.length} en proceso
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setShowAgenteModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm">
              ✨ <span className="hidden sm:inline">Generar con </span>IA
            </button>
            <button onClick={() => setShowModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg font-medium transition-colors text-xs sm:text-sm">
              + <span className="hidden sm:inline">Nuevo </span>Sprint
            </button>
          </div>
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
          <>
            {/* ════════════════════════════════════════
                VISTA MÓVIL — tarjetas apiladas
            ════════════════════════════════════════ */}
            <div className="md:hidden space-y-4">

              {/* En proceso */}
              {inProgressSprints.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2 px-1">
                    🔄 En proceso · {inProgressSprints.length} activos
                  </p>
                  <div className="space-y-2">
                    {inProgressSprints.map(board => (
                      <SprintCard key={board.id} board={board}
                        onEdit={handleStartEdit}
                        onDelete={setDeleteTarget}
                        onRegenerate={(prompt) => {
                          setAgenteInitialPrompt(prompt)
                          setAgenteInitialMode("sprint")
                          setShowAgenteModal(true)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Histórico */}
              {historico.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 px-1">
                    📚 Histórico · {boards.filter(b => !b.inProgress).length} sprints
                  </p>
                  <div className="space-y-2">
                    {historico.map(group => (
                      <div key={group.label}>
                        <button onClick={() => toggleMonth(monthKey(group.items[0]))}
                          className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                          <span>{group.label}</span>
                          <span>{openMonths.has(monthKey(group.items[0])) ? '▾' : '▸'}</span>
                        </button>
                        {openMonths.has(monthKey(group.items[0])) && (
                          <div className="space-y-2 pl-2">
                            {group.items.map(board => (
                              <SprintCard key={board.id} board={board}
                                onEdit={handleStartEdit}
                                onDelete={setDeleteTarget}
                                onRegenerate={(prompt) => {
                                  setAgenteInitialPrompt(prompt)
                                  setAgenteInitialMode("sprint")
                                  setShowAgenteModal(true)
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ════════════════════════════════════════
                VISTA DESKTOP — layout original (3 columnas)
            ════════════════════════════════════════ */}
            <div className="hidden md:flex gap-5 items-start">

              {/* Columna izquierda: En proceso */}
              <aside className="flex-shrink-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden self-start">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/20">
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">🔄 En proceso</p>
                  <p className="text-xs text-indigo-400 mt-0.5">{inProgressSprints.length} activos</p>
                </div>
                {inProgressSprints.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6 px-4">Todos los sprints están completados</p>
                ) : (
                  <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                    {inProgressSprints.map(board => (
                      <li key={board.id}>
                        <button onClick={() => handleSelect(board)}
                          className={`w-full text-left px-4 py-3 text-sm transition-colors
                            hover:bg-indigo-50 dark:hover:bg-indigo-900/20 ${
                            selected?.id === board.id
                              ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold border-l-4 border-indigo-500"
                              : "text-gray-700 dark:text-gray-300"
                          }`}>
                          <span className="block truncate">
                            {board.generatedByAI && <span className="mr-1 text-xs" title="Generado con IA">✨</span>}
                            {board.userRole === "member" && <span className="text-green-500 mr-1">🤝</span>}
                            {board.name}
                          </span>
                          <span className="text-xs text-gray-400 font-normal flex items-center gap-2 mt-0.5">
                            {board.totalCards === 0
                              ? "Sin hojas"
                              : <span className="font-medium text-indigo-500">{Math.round((board.col3Cards / board.totalCards) * 100)}% listo</span>
                            }
                            <Link href={`/board/${board.id}`} onClick={e => e.stopPropagation()}
                              className="px-1.5 py-0.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors font-medium">
                              Abrir
                            </Link>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>

              {/* Panel central */}
              <div className="flex-1 min-w-0">
                {selected ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 block mb-2">Sprint</span>
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
                          <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                                       dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            rows={3} />
                        </div>
                        {editError && <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>}
                        <div className="flex gap-3">
                          <button onClick={() => setEditing(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
                            Cancelar
                          </button>
                          <button onClick={handleSaveEdit} disabled={saving || !editName.trim()}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm">
                            {saving ? "Guardando..." : "Guardar"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-bold mb-2">{selected.name}</h2>
                            {selected.description && (
                              <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">{selected.description}</p>
                            )}
                            {selected.generatedByAI && selected.aiPrompt && (
                              <PromptViewer prompt={selected.aiPrompt} onRegenerate={(prompt) => {
                                setAgenteInitialPrompt(prompt)
                                setAgenteInitialMode("sprint")
                                setShowAgenteModal(true)
                              }} />
                            )}
                          </div>
                          {selected.userRole === "owner" && (
                            <div className="flex gap-2 ml-4 flex-shrink-0">
                              <button onClick={() => handleStartEdit(selected)}
                                className="p-2 text-gray-400 hover:text-indigo-500 transition-colors" title="Editar">✏️</button>
                              <button onClick={() => setDeleteTarget(selected)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar">🗑️</button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mb-6">
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
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                    <p className="text-2xl font-bold text-gray-400 dark:text-gray-500">¿Quieres crear un nuevo sprint?</p>
                    <p className="text-gray-400 dark:text-gray-500 mt-2">Selecciona uno de la lista o crea uno nuevo</p>
                    <button onClick={() => setShowModal(true)}
                      className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                      + Nuevo Sprint
                    </button>
                  </div>
                )}
              </div>

              {/* Columna derecha: Histórico */}
              <aside className="flex-shrink-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden self-start">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">📚 Histórico</p>
                  <p className="text-xs text-gray-400 mt-0.5">{boards.filter(b => !b.inProgress).length} sprints</p>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {historico.map(group => {
                    const key  = monthKey(group.items[0])
                    const open = openMonths.has(key)
                    return (
                      <div key={key}>
                        <button onClick={() => toggleMonth(key)}
                          className="w-full flex items-center justify-between px-4 py-2.5
                                     text-xs font-semibold text-gray-600 dark:text-gray-300
                                     hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors capitalize">
                          <span>{group.label}</span>
                          <span className="text-gray-400">{open ? '▾' : '▸'}</span>
                        </button>
                        {open && (
                          <ul className="bg-gray-50 dark:bg-gray-700/20">
                            {group.items.map(board => (
                              <li key={board.id}>
                                <button onClick={() => handleSelect(board)}
                                  className={`w-full text-left px-5 py-2.5 text-sm transition-colors
                                    hover:bg-indigo-50 dark:hover:bg-indigo-900/20 ${
                                    selected?.id === board.id
                                      ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold border-l-4 border-indigo-500"
                                      : "text-gray-700 dark:text-gray-300"
                                  }`}>
                                  <span className="block truncate text-xs">
                                    {board.generatedByAI && <span className="mr-1">✨</span>}
                                    {board.name}
                                  </span>
                                  <span className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                                    {board.totalCards === 0 ? "Sin hojas" : `${Math.round((board.col3Cards/board.totalCards)*100)}% listo`}
                                    <Link href={`/board/${board.id}`} onClick={e => e.stopPropagation()}
                                      className="px-1.5 py-0.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium">
                                      Abrir
                                    </Link>
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
          </>
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
                <input type="text" required value={newName} onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Sprint Marketing Q2 2026" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
                <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3} placeholder="¿Cuál es el objetivo de este sprint?" />
              </div>
              {createError && <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowModal(false); setCreateError("") }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={creating || !newName.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
                             disabled:opacity-50 transition-colors">
                  {creating ? "Creando..." : "Crear Sprint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-sm w-full p-6">
            <h2 className="text-lg font-bold mb-2">¿Eliminar sprint?</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Se eliminará <strong>{deleteTarget.name}</strong> y todas sus hojas. Esta acción no se puede deshacer.
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

      {/* Modal Agente Sprint / Bonsai IA */}
      {showAgenteModal && (
        <AgenteSprintModal
          onClose={() => { setShowAgenteModal(false); setAgenteInitialPrompt("") }}
          onSprintSuccess={(board: GeneratedBoard) => {
            setGeneratedBoard(board)
            setShowAgenteModal(false)
            setAgenteInitialPrompt("")
            router.push(`/board/${board.id}`)
          }}
          onBonsaiSuccess={(result: GeneratedBonsai) => {
            setGeneratedBonsai(result)
            setShowAgenteModal(false)
            setAgenteInitialPrompt("")
            fetchData()
          }}
          onQuotaExceeded={(type) => {
            setShowAgenteModal(false)
            setAgenteInitialPrompt("")
            setQuotaType(type)
            setShowQuotaModal(true)
          }}
          initialPrompt={agenteInitialPrompt}
          initialMode={agenteInitialMode}
          context="sprints"
        />
      )}

      {/* Modal Encuesta de Cuota */}
      {showQuotaModal && (
        <QuotaSurveyModal
          type={quotaType}
          onClose={() => setShowQuotaModal(false)}
        />
      )}
    </div>
  )
}
