"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import InviteModal from "@/components/InviteModal"
import AppHeader from "@/components/AppHeader"
import AppFooter from "@/components/AppFooter"
import { useSession } from "next-auth/react"

// ── Types ──
type Card = {
  id: string
  title: string
  description: string | null
  priority:    string | null
  position:    number
  createdAt:   string
  updatedAt:   string
  dueDate:     string | null  // ← NUEVO
  alertDate:   string | null  // ← NUEVO
  resources:   string | null  // ← NUEVO
  assignee: { id: string; name: string | null; email: string } | null
  creator:  { id: string; name: string | null; email: string } | null // ← NUEVO
}

type Column = {
  id: string
  name: string
  color: string | null
  wipLimit: number | null
  cards: Card[]
}

type Board = {
  id: string
  name: string
  description: string | null
  insights:    string | null  // ← NUEVO
  owner: { id: string; name: string | null; email: string }
  columns: Column[]
  members: Array<{ user: { id: string; name: string | null; email: string } }>
}

type CardFormData = {
  id?: string
  columnId:    string
  title:       string
  description: string
  priority:    string
  assignedTo:  string
  dueDate:     string  // ← NUEVO
  alertDate:   string  // ← NUEVO
  resources:   string  // ← NUEVO
}

type LogEntry = {
  id: string
  cardTitle: string
  fromCol:   string | null
  toCol:     string | null
  createdAt: string
  user: { name: string | null; email: string }
}

// ── Helper: formatear fecha ──
function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

// ── Bitácora como columna lateral ──
function ActivityColumn({ boardId }: { boardId: string }) {
  const [logs, setLogs]         = useState<LogEntry[]>([])
  const [openDays, setOpenDays] = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchLogs = async () => {
      const res = await fetch(`/api/boards/${boardId}/activity`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
        // Abrir "Hoy" por defecto si hay actividad
        if (data.length > 0) {
          setOpenDays(new Set([new Date().toDateString()]))
        }
      }
    }
    fetchLogs()
    const interval = setInterval(fetchLogs, 15000)
    return () => clearInterval(interval)
  }, [boardId])

  const getDayKey   = (date: string) => new Date(date).toDateString()
  const getDayLabel = (date: string) => {
    const d         = new Date(date)
    const today     = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === today.toDateString())     return 'Hoy'
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const timeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60)   return `hace ${diff}s`
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
    return `hace ${Math.floor(diff / 3600)}h`
  }

  const toggleDay = (key: string) => {
    setOpenDays(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Agrupar logs por día
  const grouped = logs.reduce((acc, log) => {
    const key = getDayKey(log.createdAt)
    if (!acc.has(key)) acc.set(key, [])
    acc.get(key)!.push(log)
    return acc
  }, new Map<string, LogEntry[]>())

  return (
    <div className="flex-shrink-0 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-md flex flex-col self-start">
      <div className="p-4 border-b-4 border-gray-300 dark:border-gray-600">
        <h2 className="font-semibold text-lg">📋 Bitácora</h2>
        <span className="text-xs text-gray-400">{logs.length} eventos registrados</span>
      </div>
      <div className="overflow-y-auto max-h-[600px] divide-y divide-gray-100 dark:divide-gray-700">
        {logs.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Sin actividad aún</p>
        ) : (
          Array.from(grouped.entries()).map(([key, dayLogs]) => {
            const open = openDays.has(key)
            return (
              <div key={key}>
                <button onClick={() => toggleDay(key)}
                  className="w-full flex items-center justify-between px-4 py-2.5
                             text-xs font-semibold text-gray-600 dark:text-gray-300
                             hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <span>{getDayLabel(dayLogs[0].createdAt)}</span>
                  <span className="text-gray-400">{open ? '▾' : '▸'}</span>
                </button>
                {open && (
                  <div className="bg-gray-50 dark:bg-gray-700/20 px-4 py-2 space-y-3">
                    {dayLogs.map(log => (
                      <div key={log.id}
                        className="text-xs text-gray-600 dark:text-gray-300 pb-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <div className="flex justify-between mb-0.5">
                          <span className="font-medium">{log.user.name || log.user.email}</span>
                          <span className="text-gray-400 ml-2 whitespace-nowrap">{timeAgo(log.createdAt)}</span>
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          movió <span className="italic text-gray-700 dark:text-gray-200">"{log.cardTitle}"</span>
                          {log.fromCol && log.toCol && (
                            <> de <span className="text-blue-500">{log.fromCol}</span>
                            {' → '}<span className="text-green-500">{log.toCol}</span></>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ── Página principal ──
export default function BoardDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data: session } = useSession()

  const [board, setBoard]                   = useState<Board | null>(null)
  const [loading, setLoading]               = useState(true)
  const [showModal, setShowModal]           = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showSprintModal, setShowSprintModal] = useState(false)  // ← NUEVO
  const [modalMode, setModalMode]           = useState<'create' | 'edit'>('create')
  const [formData, setFormData]             = useState<CardFormData>({
    columnId: '', title: '', description: '', priority: '', assignedTo: '',
    dueDate: '', alertDate: '', resources: '',
  })
  const [sprintForm, setSprintForm] = useState({ name: '', description: '', insights: '' }) // ← NUEVO
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [activeCard, setActiveCard] = useState<Card | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => { fetchBoard() }, [])

  const fetchBoard = async () => {
    try {
      const res = await fetch(`/api/boards/${params.id}`)
      if (res.ok) setBoard(await res.json())
      else router.push('/dashboard')
    } catch (e) {
      console.error('Error:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCard = (columnId: string) => {
    setModalMode('create')
    setFormData({ columnId, title: '', description: '', priority: '', assignedTo: '',
      dueDate: '', alertDate: '', resources: '' })
    setShowModal(true)
    setError('')
  }

  const handleEditCard = (card: Card, columnId: string) => {
    setModalMode('edit')
    setFormData({
      id: card.id, columnId,
      title:       card.title,
      description: card.description  || '',
      priority:    card.priority     || '',
      assignedTo:  card.assignee?.id || '',
      // Las fechas vienen como ISO completo — recortamos a YYYY-MM-DD para el input
      dueDate:   card.dueDate   ? card.dueDate.substring(0, 10)   : '',
      alertDate: card.alertDate ? card.alertDate.substring(0, 10) : '',
      resources: card.resources || '',
    })
    setShowModal(true)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const url    = modalMode === 'create' ? '/api/cards' : `/api/cards/${formData.id}`
      const method = modalMode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          dueDate:   formData.dueDate   || null,
          alertDate: formData.alertDate || null,
          resources: formData.resources || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Error al guardar tarjeta')
        setSaving(false)
        return
      }
      setShowModal(false)
      fetchBoard()
    } catch {
      setError('Error al guardar tarjeta')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cardId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta tarjeta?')) return
    try {
      const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' })
      if (res.ok) fetchBoard()
    } catch (e) { console.error('Error al eliminar:', e) }
  }

  const handleKickMember = async (userId: string, userName: string) => {
    if (!confirm(`¿Retirar a ${userName} del sprint?`)) return
    const res = await fetch(`/api/boards/${board!.id}/members/${userId}`, { method: 'DELETE' })
    if (res.ok) fetchBoard()
  }

  const handleUpdateWipLimit = async (columnId: string, newLimit: number | null) => {
    try {
      const res = await fetch(`/api/columns/${columnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wipLimit: newLimit }),
      })
      if (res.ok) fetchBoard()
    } catch (e) { console.error('Error al actualizar WIP:', e) }
  }

  // ← NUEVO: abrir modal de edición del sprint
  const handleEditSprint = () => {
    if (!board) return
    setSprintForm({
      name:        board.name,
      description: board.description || '',
      insights:    board.insights    || '',
    })
    setShowSprintModal(true)
  }

  // ← NUEVO: guardar cambios del sprint
  const handleSaveSprint = async () => {
    if (!board || !sprintForm.name) return
    setSaving(true)
    try {
      const res = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sprintForm),
      })
      if (res.ok) { setShowSprintModal(false); fetchBoard() }
    } catch (e) { console.error('Error al guardar sprint:', e) }
    finally { setSaving(false) }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = event.active.id as string
    for (const col of board?.columns || []) {
      const card = col.cards.find(c => c.id === cardId)
      if (card) { setActiveCard(card); break }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)
    if (!over || !board) return

    const cardId = active.id as string
    const overId = over.id   as string

    let srcCol: Column | undefined
    for (const col of board.columns) {
      if (col.cards.find(c => c.id === cardId)) { srcCol = col; break }
    }
    if (!srcCol) return

    let targetColId = overId
    let isOverCard  = false
    for (const col of board.columns) {
      if (col.cards.some(c => c.id === overId)) { targetColId = col.id; isOverCard = true; break }
    }

    if (isOverCard && targetColId === srcCol.id) {
      const oldIdx = srcCol.cards.findIndex(c => c.id === cardId)
      const newIdx = srcCol.cards.findIndex(c => c.id === overId)
      if (oldIdx !== newIdx) {
        setBoard({
          ...board,
          columns: board.columns.map(col =>
            col.id === srcCol!.id ? { ...col, cards: arrayMove(col.cards, oldIdx, newIdx) } : col
          ),
        })
      }
      return
    }

    if (targetColId !== srcCol.id) {
      try {
        const res = await fetch(`/api/cards/${cardId}/move`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columnId: targetColId, position: 1 }),
        })
        if (res.ok) fetchBoard()
      } catch (e) { console.error('Error al mover:', e) }
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><p>Cargando...</p></div>
  )
  if (!board) return (
    <div className="min-h-screen flex items-center justify-center"><p>Sprint no encontrado</p></div>
  )

  const isOwner    = session?.user?.id === board.owner.id
  const allMembers = [board.owner, ...board.members.map(m => m.user)]

  // ← NUEVO: Lapso calculado desde las tarjetas
  const allCards  = board.columns.flatMap(c => c.cards)
  const cardTimes = allCards.map(c => new Date(c.createdAt).getTime())
  const dueTimes  = allCards.filter(c => c.dueDate).map(c => new Date(c.dueDate!).getTime())
  const lapsoStart = cardTimes.length > 0
    ? formatDate(new Date(Math.min(...cardTimes)).toISOString()) : null
  const lapsoEnd   = dueTimes.length > 0
    ? formatDate(new Date(Math.max(...dueTimes)).toISOString())  : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <AppHeader />

        <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

          {/* ── Encabezado del Sprint ── */}
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                {/* Etiqueta Sprint + botón editar */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">
                    Sprint
                  </span>
                  {isOwner && (
                    <button onClick={handleEditSprint}
                      className="text-xs text-gray-400 hover:text-indigo-500 transition-colors"
                      title="Editar sprint">✏️</button>
                  )}
                </div>
                <h1 className="text-3xl font-bold mb-2">{board.name}</h1>
                {board.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-2">{board.description}</p>
                )}
                {/* ← NUEVO: Lapso */}
                {(lapsoStart || lapsoEnd) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    📅 Lapso: <strong>{lapsoStart || '—'}</strong> → <strong>{lapsoEnd || 'sin fecha límite'}</strong>
                  </p>
                )}
                {/* ← NUEVO: Insights */}
                {board.insights && (
                  <div className="mt-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-3 max-w-2xl">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">💡 Insights</p>
                    <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-line">{board.insights}</p>
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                  <span>Propietario: {board.owner.name || board.owner.email}</span>
                  <span>•</span>
                  <span>{board.columns.length} columnas</span>
                  <span>•</span>
                  <span>{allCards.length} tarjetas</span>
                </div>
              </div>
              {isOwner && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm"
                >
                  📨 Invitar usuario
                </button>
              )}
            </div>

            {/* ← Renombrado: Equipo (antes: Miembros) */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">Equipo:</span>
              <span className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs px-3 py-1 rounded-full">
                👑 {board.owner.name || board.owner.email}
              </span>
              {board.members.filter(m => m.user.id !== board.owner.id).map(member => (
                <span key={member.user.id}
                  className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-3 py-1 rounded-full">
                  🤝 {member.user.name || member.user.email}
                  {isOwner && (
                    <button
                      onClick={() => handleKickMember(member.user.id, member.user.name || member.user.email)}
                      className="ml-1 text-red-400 hover:text-red-600 font-bold leading-none"
                      title="Retirar del sprint"
                    >×</button>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* ── Columnas Kanban + Actividad ── */}
          <div className="flex gap-6 overflow-x-auto pb-4 items-start">
            {board.columns.map(col => (
              <DroppableColumn
                key={col.id}
                column={col}
                isOwner={isOwner}
                onCreateCard={handleCreateCard}
                onEditCard={handleEditCard}
                onDeleteCard={handleDelete}
                onUpdateWipLimit={handleUpdateWipLimit}
              />
            ))}
            {/* ← NUEVO: Actividad como 4ta columna */}
            <ActivityColumn boardId={board.id} />
          </div>
        </main>

        <AppFooter />
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeCard ? (
          <div className="w-80 bg-white dark:bg-gray-700 border-2 border-blue-500 rounded-lg p-4 shadow-xl opacity-90 rotate-3">
            <h3 className="font-medium mb-2">{activeCard.title}</h3>
            {activeCard.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{activeCard.description}</p>
            )}
          </div>
        ) : null}
      </DragOverlay>

      {/* ── Modal Crear / Editar Tarjeta ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 my-4">
            <h2 className="text-xl font-bold mb-4">
              {modalMode === 'create' ? 'Nueva Tarjeta' : 'Editar Tarjeta'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-sm font-medium mb-1">Título *</label>
                <input type="text" required value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Título de la tarjeta" />
              </div>
              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3} placeholder="Describe la tarea..." />
              </div>
              {/* Prioridad */}
              <div>
                <label className="block text-sm font-medium mb-1">Prioridad</label>
                <select value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sin prioridad</option>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              {/* Asignar a */}
              <div>
                <label className="block text-sm font-medium mb-1">Asignar a</label>
                <select value={formData.assignedTo}
                  onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sin asignar</option>
                  {allMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name || m.email}</option>
                  ))}
                </select>
              </div>
              {/* ← NUEVO: Fechas en dos columnas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">📅 Fecha límite</label>
                  <input type="date" value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">🔔 Alerta</label>
                  <input type="date" value={formData.alertDate}
                    onChange={e => setFormData({ ...formData, alertDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </div>
              {/* ← NUEVO: Recursos */}
              <div>
                <label className="block text-sm font-medium mb-1">🔗 Recursos (URLs)</label>
                <textarea value={formData.resources}
                  onChange={e => setFormData({ ...formData, resources: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  rows={3}
                  placeholder={"https://docs.google.com/...\nhttps://drive.google.com/..."} />
                <p className="text-xs text-gray-400 mt-1">Una URL por línea</p>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : modalMode === 'create' ? 'Crear' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── NUEVO: Modal Editar Sprint ── */}
      {showSprintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">✏️ Editar Sprint</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input type="text" value={sprintForm.name}
                  onChange={e => setSprintForm({ ...sprintForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea value={sprintForm.description}
                  onChange={e => setSprintForm({ ...sprintForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">💡 Insights (lecciones aprendidas)</label>
                <textarea value={sprintForm.insights}
                  onChange={e => setSprintForm({ ...sprintForm, insights: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={4} placeholder="¿Qué aprendimos en este sprint?" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowSprintModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancelar
                </button>
                <button onClick={handleSaveSprint} disabled={saving || !sprintForm.name}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Invitar */}
      {showInviteModal && (
        <InviteModal boardId={board.id} onClose={() => setShowInviteModal(false)} />
      )}
    </DndContext>
  )
}

// ── Columna Droppable (sin cambios funcionales) ──
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { DraggableCard } from "./DraggableCard"

function DroppableColumn({
  column, isOwner, onCreateCard, onEditCard, onDeleteCard, onUpdateWipLimit,
}: {
  column: Column
  isOwner: boolean
  onCreateCard: (columnId: string) => void
  onEditCard: (card: Card, columnId: string) => void
  onDeleteCard: (cardId: string) => void
  onUpdateWipLimit: (columnId: string, newLimit: number | null) => void
}) {
  const { setNodeRef } = useDroppable({ id: column.id })
  const [editingWip, setEditingWip] = useState(false)
  const [wipInput, setWipInput]     = useState(column.wipLimit?.toString() || '')

  const count = column.cards.length
  const limit = column.wipLimit

  const getWipStyle = () => {
    if (!limit) return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
    const ratio = count / limit
    if (ratio >= 1)   return 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-bold animate-pulse'
    if (ratio >= 0.8) return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 font-semibold'
    return 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
  }

  const getWipIcon = () => {
    if (!limit) return ''
    const ratio = count / limit
    if (ratio >= 1)   return ' 🔴'
    if (ratio >= 0.8) return ' 🟡'
    return ' 🟢'
  }

  const handleWipSave = () => {
    const val    = wipInput.trim()
    const parsed = val === '' ? null : parseInt(val, 10)
    if (val !== '' && (isNaN(parsed!) || parsed! < 1)) return
    onUpdateWipLimit(column.id, parsed)
    setEditingWip(false)
  }

  return (
    <div ref={setNodeRef} className="flex-shrink-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="p-4 border-b-4" style={{ borderColor: column.color || '#6b7280' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-lg">{column.name}</h2>
          {editingWip ? (
            <div className="flex items-center gap-1">
              <input type="number" min="1" value={wipInput}
                onChange={e => setWipInput(e.target.value)}
                className="w-16 text-sm px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 text-center"
                placeholder="máx" autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter')  handleWipSave()
                  if (e.key === 'Escape') setEditingWip(false)
                }} />
              <button onClick={handleWipSave} className="text-green-600 font-bold text-sm">✓</button>
              <button onClick={() => setEditingWip(false)} className="text-gray-400 text-sm">✕</button>
            </div>
          ) : (
            <span
              className={`text-sm px-2 py-1 rounded cursor-pointer transition-all ${getWipStyle()} ${isOwner ? 'hover:ring-2 hover:ring-blue-400' : ''}`}
              onClick={() => isOwner && setEditingWip(true)}
              title={isOwner ? 'Clic para editar límite WIP' : limit ? `Límite: ${limit}` : ''}
            >
              {limit ? `${count}/${limit}${getWipIcon()}` : isOwner ? `${count} ✎` : count}
            </span>
          )}
        </div>

        {limit && count > limit && (
          <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded mb-2">
            ⚠️ Límite WIP superado ({count - limit} tarjeta{count - limit > 1 ? 's' : ''} extra)
          </div>
        )}

        <button onClick={() => onCreateCard(column.id)}
          className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
          + Agregar Tarjeta
        </button>
      </div>
      <div className="p-4 space-y-3 min-h-[200px]">
        <SortableContext items={column.cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {column.cards.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Arrastra tarjetas aquí</p>
          ) : (
            column.cards.map(card => (
              <DraggableCard key={card.id} card={card} columnId={column.id}
                onEdit={onEditCard} onDelete={onDeleteCard} />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}
