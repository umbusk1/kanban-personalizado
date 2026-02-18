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

  useEffect(() => {
    fetchBoard()
  }, [])

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
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{board.name}</h1>
            {board.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-2">{board.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>Propietario: {board.owner.name || board.owner.email}</span>
              <span>•</span>
              <span>{board.members.length + 1} miembros</span>
              <span>•</span>
              <span>{board.columns.length} columnas</span>
            </div>
          </div>

          {/* Botón Invitar: solo visible para el dueño */}
          {session?.user?.id === board.owner.id && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg
                         hover:bg-indigo-700 transition-colors font-medium text-sm"
            >
              📨 Invitar usuario
            </button>
          )}
        </div>

        {/* Columnas */}
        <div className="flex gap-6 overflow-x-auto pb-4">
          {board.columns.map((column) => (
            <DroppableColumn
              key={column.id}
              column={column}
              onCreateCard={handleCreateCard}
              onEditCard={handleEditCard}
              onDeleteCard={handleDelete}
            />
          ))}
        </div>
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
  onCreateCard,
  onEditCard,
  onDeleteCard,
}: {
  column: Column
  onCreateCard: (columnId: string) => void
  onEditCard: (card: Card, columnId: string) => void
  onDeleteCard: (cardId: string) => void
}) {
  const { setNodeRef } = useDroppable({ id: column.id })

  return (
    <div ref={setNodeRef} className="flex-shrink-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="p-4 border-b-4" style={{ borderColor: column.color || '#gray' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-lg">{column.name}</h2>
          {column.wipLimit && (
            <span className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
              {column.cards.length}/{column.wipLimit}
            </span>
          )}
        </div>
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
}
