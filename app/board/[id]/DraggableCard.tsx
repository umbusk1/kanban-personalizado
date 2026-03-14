import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

// ← ACTUALIZADO: tipo Card con los campos nuevos
type Card = {
  id: string
  title: string
  description: string | null
  priority: string | null
  position: number
  createdAt: string
  updatedAt: string
  dueDate:   string | null  // ← NUEVO
  alertDate: string | null  // ← NUEVO
  resources: string | null  // ← NUEVO
  assignee: {
    id: string
    name: string | null
    email: string
  } | null
  creator: {
    id: string
    name: string | null
    email: string
  } | null // ← NUEVO
}

const PRIORITIES = [
  { value: '',      label: 'Sin prioridad', icon: '⚪', border: 'border-l-gray-300  dark:border-l-gray-600', badge: 'bg-gray-100  text-gray-500  dark:bg-gray-700 dark:text-gray-400' },
  { value: 'baja',  label: 'Baja',          icon: '🟢', border: 'border-l-green-400 dark:border-l-green-500', badge: 'bg-green-100  text-green-800 dark:bg-green-900  dark:text-green-200' },
  { value: 'media', label: 'Media',         icon: '🟡', border: 'border-l-yellow-400 dark:border-l-yellow-400', badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'alta',  label: 'Alta',          icon: '🔴', border: 'border-l-red-500   dark:border-l-red-400',  badge: 'bg-red-100    text-red-800   dark:bg-red-900    dark:text-red-200' },
]

function getPriority(value: string | null) {
  return PRIORITIES.find(p => p.value === (value ?? '')) ?? PRIORITIES[0]
}

// ← NUEVO: formatea fecha como "15 mar 2025"
function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

// ← NUEVO: calcula el estado visual de la fecha límite
function getDueDateStatus(dueDate: string | null): 'overdue' | 'soon' | 'ok' | null {
  if (!dueDate) return null
  const now  = new Date()
  const due  = new Date(dueDate)
  const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) // días
  if (diff < 0)  return 'overdue' // ya venció
  if (diff <= 3) return 'soon'    // vence en 3 días o menos
  return 'ok'
}

const DUE_STYLES = {
  overdue: 'bg-red-100    text-red-700   dark:bg-red-900   dark:text-red-300',
  soon:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  ok:      'bg-green-50   text-green-700 dark:bg-green-900  dark:text-green-300',
}

export function DraggableCard({
  card,
  columnId,
  onEdit,
  onDelete,
}: {
  card: Card
  columnId: string
  onEdit: (card: Card, columnId: string) => void
  onDelete: (cardId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id })

  const [currentPriority, setCurrentPriority] = useState(card.priority ?? '')
  const [saving, setSaving] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const p          = getPriority(currentPriority)
  const dueStatus  = getDueDateStatus(card.dueDate)

  // ← NUEVO: convierte el campo resources en array de URLs
  const resourceLinks = card.resources
    ? card.resources.split('\n').map(u => u.trim()).filter(Boolean)
    : []

  // Cicla prioridad: '' → 'baja' → 'media' → 'alta' → ''
  const handleCyclePriority = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (saving) return
    const idx  = PRIORITIES.findIndex(p => p.value === currentPriority)
    const next = PRIORITIES[(idx + 1) % PRIORITIES.length]
    setSaving(true)
    setCurrentPriority(next.value)
    try {
      await fetch(`/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: next.value || null }),
      })
    } catch (err) {
      console.error('Error al cambiar prioridad:', err)
      setCurrentPriority(currentPriority)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        bg-white dark:bg-gray-700
        border border-gray-200 dark:border-gray-600
        border-l-4 ${p.border}
        rounded-lg p-4 shadow-sm hover:shadow-md
        transition-all cursor-grab active:cursor-grabbing group
      `}
    >
      {/* Título + botones editar/eliminar */}
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium flex-1 leading-snug">{card.title}</h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          <button
            onClick={e => { e.stopPropagation(); onEdit(card, columnId) }}
            className="text-blue-600 hover:text-blue-700 text-xs"
            title="Editar"
          >✏️</button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(card.id) }}
            className="text-red-600 hover:text-red-700 text-xs"
            title="Eliminar"
          >🗑️</button>
        </div>
      </div>

      {/* Descripción */}
      {card.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {card.description}
        </p>
      )}

      {/* ← NUEVO: Fecha límite */}
      {card.dueDate && dueStatus && (
        <div className={`
          inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded mb-2 font-medium
          ${DUE_STYLES[dueStatus]}
        `}>
          <span>{dueStatus === 'overdue' ? '⚠️' : '📅'}</span>
          <span>
            {dueStatus === 'overdue' ? 'Venció ' : 'Límite '}
            {formatDate(card.dueDate)}
          </span>
        </div>
      )}

      {/* ← NUEVO: Recursos (URLs) */}
      {resourceLinks.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {resourceLinks.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-xs text-blue-500 hover:underline truncate max-w-[140px]"
              title={url}
            >
              🔗 Recurso {resourceLinks.length > 1 ? i + 1 : ''}
            </a>
          ))}
        </div>
      )}

      {/* Prioridad + asignado + fechas de auditoría */}
      <div className="flex items-center justify-between text-xs mt-2">
        {/* Badge de prioridad — clic para cambiar */}
        <button
          onClick={handleCyclePriority}
          disabled={saving}
          title="Clic para cambiar prioridad"
          className={`
            flex items-center gap-1 px-2 py-1 rounded font-medium
            transition-all hover:scale-105 active:scale-95
            ${p.badge} ${saving ? 'opacity-50' : ''}
          `}
        >
          <span>{p.icon}</span>
          <span>{p.label}</span>
        </button>

        <div className="flex items-center gap-2">
          {/* ← NUEVO: fechas de creación y última edición */}
          <div className="text-gray-400 dark:text-gray-500 text-right leading-tight hidden group-hover:block">
            <div title="Creada">📋 {formatDate(card.createdAt)}</div>
            {card.createdAt !== card.updatedAt && (
              <div title="Última edición">✏️ {formatDate(card.updatedAt)}</div>
            )}
          </div>

          {/* Avatar del asignado */}
          {card.assignee && (
            <div
              className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold"
              title={`Asignado: ${card.assignee.name || card.assignee.email}`}
            >
              {card.assignee.name?.[0]?.toUpperCase() || card.assignee.email[0].toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
