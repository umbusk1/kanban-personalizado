"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type Card = {
  id: string
  title: string
  description: string | null
  priority: string | null
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
  const [board, setBoard] = useState<Board | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
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
    setFormData({
      columnId,
      title: '',
      description: '',
      priority: '',
      assignedTo: '',
    })
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
        // Crear tarjeta
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
        // Editar tarjeta
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

      // Cerrar modal y recargar
      setShowModal(false)
      setSaving(false)
      fetchBoard()
    } catch (error) {
      setError('Error al guardar tarjeta')
      setSaving(false)
    }
  }

  const handleDelete = async (cardId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta tarjeta?')) {
      return
    }

    try {
      const response = await fetch(`/api/cards/${cardId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchBoard()
      }
    } catch (error) {
      console.error('Error al eliminar:', error)
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

  // Lista de usuarios para asignar
  const allMembers = [
    board.owner,
    ...board.members.map(m => m.user)
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <Link
          href="/dashboard"
          className="text-blue-600 hover:underline text-sm"
        >
          ← Volver al Dashboard
        </Link>
        <Link
          href="/api/auth/signout"
          className="text-sm text-red-600 hover:text-red-700"
        >
          Salir
        </Link>
      </div>

      {/* Info del tablero */}
      <div className="mb-8">
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

      {/* Columnas */}
      <div className="flex gap-6 overflow-x-auto pb-4">
        {board.columns.map((column) => (
          <div
            key={column.id}
            className="flex-shrink-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-md"
          >
            {/* Header de Columna */}
            <div 
              className="p-4 border-b-4" 
              style={{ borderColor: column.color || '#gray' }}
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-lg">{column.name}</h2>
                {column.wipLimit && (
                  <span className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {column.cards.length}/{column.wipLimit}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleCreateCard(column.id)}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                + Agregar Tarjeta
              </button>
            </div>

            {/* Tarjetas */}
            <div className="p-4 space-y-3 min-h-[200px]">
              {column.cards.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">
                  No hay tarjetas
                </p>
              ) : (
                column.cards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium flex-1">{card.title}</h3>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditCard(card, column.id)}
                          className="text-blue-600 hover:text-blue-700 text-xs"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(card.id)}
                          className="text-red-600 hover:text-red-700 text-xs"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    {card.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {card.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs">
                      {card.priority && (
                        <span
                          className={`px-2 py-1 rounded font-medium ${
                            card.priority === 'alta'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : card.priority === 'media'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}
                        >
                          {card.priority}
                        </span>
                      )}
                      
                      {card.assignee && (
                        <div className="flex items-center gap-1">
                          <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                            {card.assignee.name?.[0] || card.assignee.email[0].toUpperCase()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Crear/Editar Tarjeta */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {modalMode === 'create' ? 'Nueva Tarjeta' : 'Editar Tarjeta'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Título de la tarjeta"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Descripción
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Describe la tarea..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Prioridad
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin prioridad</option>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Asignar a
                </label>
                <select
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin asignar</option>
                  {allMembers.map((member) => (
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
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
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
    </div>
  )
}
