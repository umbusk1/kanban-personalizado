"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import InviteModal from "@/components/InviteModal"
import { useSession } from "next-auth/react"

type Card = {
  id: string
  title: string
  description: string | null
  priority: string | null
  position: number
  assignee: {
    id: string
    name: string | null
    email: string
  } | null
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
  owner: {
    id: string
    name: string | null
    email: string
  }
  columns: Column[]
  members: Array<{
    user: {
      id: string
      name: string | null
      email: string
    }
  }>
}

type CardFormData = {
  id?: string
  columnId: string
  title: string
  description: string
  priority: string
  assignedTo: string
}

export default function BoardDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const { data: session } = useSession()
  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [formData, setFormData] = useState<CardFormData>({
    columnId: '',
    title: '',
    description: '',
    priority: '',
    assignedTo: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [activeCard, setActiveCard] = useState<Card | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  useEffect(() => { fetchBoard() }, [])

  const fetchBoard = async () => {
    try {
      const response = await fetch(`/api/boards/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setBoard(data)
      } else {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCard = (columnId: string) => {
    setModalMode('create')
    setFormData({ columnId, title: '', description: '', priority: '', assignedTo: '' })
    setShowModal(true)
    setError('')
  }

  const handleEditCard = (card: Card, columnId: string) => {
    setModalMode('edit')
    setFormData({
      id: card.id,
      columnId,
      title: card.title,
      description: card.description || '',
      priority: card.priority || '',
      assignedTo: card.assignee?.id || '',
    })
    setShowModal(true)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)

    try {
      if (modalMode === 'create') {
        const response = await fetch('/api/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!response.ok) {
          const data = await response.json()
          setError(data.error || 'Error al crear tarjeta')
          setSaving(false)
          return
        }
      } else {
        const response = await fetch(`/api/cards/${formData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!response.ok) {
          const data = await response.json()
          setError(data.error || 'Error al actualizar tarjeta')
          setSaving(false)
          return
        }
      }

      setShowModal(false)
      setSaving(false)
      fetchBoard()
    } catch {
      setError('Error al guardar tarjeta')
      setSaving(false)
    }
  }

  const handleDelete = async (cardId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta tarjeta?')) return
    try {
      const response = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' })
      if (response.ok) fetchBoard()
    } catch (error) {
      console.error('Error al eliminar:', error)
    }
  }

  const handleKickMember = async (userId: string, userName: string) => {
    if (!confirm(`¿Expulsar a ${userName} del tablero?`)) return
    const res = await fetch(`/api/boards/${board!.id}/members/${userId}`, {
      method: 'DELETE',
    })
    if (res.ok) fetchBoard()
  }

  // ── NUEVO: Actualizar WIP limit de una columna ──
  const handleUpdateWipLimit = async (columnId: string, newLimit: number | null) => {
    try {
      const response = await fetch(`/api/columns/${columnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wipLimit: newLimit }),
      })
      if (response.ok) fetchBoard()
    } catch (error) {
      console.error('Error al actualizar WIP limit:', error)
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = event.active.id as string
    for (const column of board?.columns || []) {
      const card = column.cards.find(c => c.id === cardId)
      if (card) { setActiveCard(card); break }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)
    if (!over || !board) return

    const cardId = active.id as string
    const overId = over.id as string

    let sourceColumn: Column | undefined
    let sourceCard: Card | undefined
    for (const column of board.columns) {
      const card = column.cards.find(c => c.id === cardId)
      if (card) { sourceColumn = column; sourceCard = card; break }
    }
    if (!sourceColumn || !sourceCard) return

    let targetColumnId = overId
    let isOverCard = false
    for (const column of board.columns) {
      if (column.cards.some(c => c.id === overId)) {
        targetColumnId = column.id
        isOverCard = true
        break
      }
    }

    if (isOverCard && targetColumnId === sourceColumn.id) {
      const oldIndex = sourceColumn.cards.findIndex(c => c.id === cardId)
      const newIndex = sourceColumn.cards.findIndex(c => c.id === overId)
      if (oldIndex !== newIndex) {
        const newCards = arrayMove(sourceColumn.cards, oldIndex, newIndex)
        setBoard({
          ...board,
          columns: board.columns.map(col =>
            col.id === sourceColumn!.id ? { ...col, cards: newCards } : col
          ),
        })
      }
      return
    }

    if (targetColumnId !== sourceColumn.id) {
      try {
        const response = await fetch(`/api/cards/${cardId}/move`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columnId: targetColumnId, position: 1 }),
        })
        if (response.ok) fetchBoard()
      } catch (error) {
        console.error('Error al mover tarjeta:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Tablero no encontrado</p>
      </div>
    )
  }

  const isOwner = session?.user?.id === board.owner.id
  const allMembers = [board.owner, ...board.members.map(m => m.user)]

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">

        {/* Header */}
        <div className="mb-4 flex justify-between items-center">
          <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
            ← Volver al Dashboard
          </Link>
          <Link href="/api/auth/signout" className="text-sm text-red-600 hover:text-red-700">
            Salir
          </Link>
        </div>

        {/* Info del tablero */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{board.name}</h1>
              {board.description && (
                <p className="text-gray-600 dark:text-gray-400 mb-2">{board.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>Propietario: {board.owner.name || board.owner.email}</span>
                <span>•</span>
                <span>{board.columns.length} columnas</span>
              </div>
            </div>

            {isOwner && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg
                           hover:bg-indigo-700 transition-colors font-medium text-sm"
              >
                📨 Invitar usuario
              </button>
            )}
          </div>

          {/* Lista de miembros */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">Miembros:</span>
            <span className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-700
                             dark:text-blue-300 text-xs px-3 py-1 rounded-full">
              👑 {board.owner.name || board.owner.email}
            </span>
            {board.members.map(member => (
              <span
                key={member.user.id}
                className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-700
                           dark:text-gray-300 text-xs px-3 py-1 rounded-full"
              >
                🤝 {member.user.name || member.user.email}
                {isOwner && (
                  <button
                    onClick={() => handleKickMember(
                      member.user.id,
                      member.user.name || member.user.email
                    )}
                    className="ml-1 text-red-400 hover:text-red-600 font-bold leading-none"
                    title="Expulsar del tablero"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Columnas */}
        <div className="flex gap-6 overflow-x-auto pb-4">
          {board.columns.map((column) => (
            <DroppableColumn
              key={column.id}
              column={column}
              isOwner={isOwner}
              onCreateCard={handleCreateCard}
              onEditCard={handleEditCard}
              onDeleteCard={handleDelete}
              onUpdateWipLimit={handleUpdateWipLimit}
            />
          ))}
        </div>
        {/* ── NUEVO: Activity Log ── */}
        <ActivityBar boardId={board.id} />
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

      {/* Modal Crear/Editar Tarjeta */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {modalMode === 'create' ? 'Nueva Tarjeta' : 'Editar Tarjeta'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Título *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Título de la tarjeta"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe la tarea..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prioridad</label>
                <select
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin prioridad</option>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Asignar a</label>
                <select
                  value={formData.assignedTo}
                  onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin asignar</option>
                  {allMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name || member.email}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : modalMode === 'create' ? 'Crear' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Invitar */}
      {showInviteModal && (
        <InviteModal
          boardId={board.id}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </DndContext>
  )
}

// ── Componente de Columna Droppable ──
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { DraggableCard } from "./DraggableCard"

function DroppableColumn({
  column,
  isOwner,
  onCreateCard,
  onEditCard,
  onDeleteCard,
  onUpdateWipLimit,
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
  const [wipInput, setWipInput] = useState(column.wipLimit?.toString() || '')

  // ── Lógica de color del WIP ──
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
    const val = wipInput.trim()
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

          {/* ── Contador WIP con colores ── */}
          {editingWip ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                value={wipInput}
                onChange={e => setWipInput(e.target.value)}
                className="w-16 text-sm px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 text-center"
                placeholder="máx"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleWipSave()
                  if (e.key === 'Escape') setEditingWip(false)
                }}
              />
              <button onClick={handleWipSave} className="text-green-600 hover:text-green-700 font-bold text-sm">✓</button>
              <button onClick={() => setEditingWip(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
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

        {/* Alerta si límite superado */}
        {limit && count > limit && (
          <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded mb-2">
            ⚠️ Límite WIP superado ({count - limit} tarjeta{count - limit > 1 ? 's' : ''} extra)
          </div>
        )}

        <button
          onClick={() => onCreateCard(column.id)}
          className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          + Agregar Tarjeta
        </button>
      </div>
      <div className="p-4 space-y-3 min-h-[200px]">
        <SortableContext items={column.cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {column.cards.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Arrastra tarjetas aquí</p>
          ) : (
            column.cards.map(card => (
              <DraggableCard
                key={card.id}
                card={card}
                columnId={column.id}
                onEdit={onEditCard}
                onDelete={onDeleteCard}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
  // ── Componente Activity Log ──
function ActivityBar({ boardId }: { boardId: string }) {
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    const fetchLogs = async () => {
      const res = await fetch(`/api/boards/${boardId}/activity`)
      if (res.ok) setLogs(await res.json())
    }
    fetchLogs()
    const interval = setInterval(fetchLogs, 15000) // refresca cada 15s
    return () => clearInterval(interval)
  }, [boardId])

  const timeAgo = (date: string) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return `hace ${diff}s`
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
    return `hace ${Math.floor(diff / 3600)}h`
  }

  if (logs.length === 0) return null

  return (
    <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
        🕐 Actividad reciente
      </h3>
      <div className="space-y-2">
        {logs.map(log => (
          <div key={log.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium">{log.user.name || log.user.email}</span>
            <span className="text-gray-400">movió</span>
            <span className="italic">"{log.cardTitle}"</span>
            <span className="text-gray-400">de</span>
            <span className="text-blue-500">{log.fromCol}</span>
            <span className="text-gray-400">→</span>
            <span className="text-green-500">{log.toCol}</span>
            <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">{timeAgo(log.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
}
