import { useState, useEffect } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

type Card = {
  id: string
  title: string
  description: string | null
  priority: string | null
  position: number
  createdAt: string
  updatedAt: string
  dueDate:   string | null
  alertDate: string | null
  resources: string | null
  assignee: { id: string; name: string | null; email: string } | null
  creator:  { id: string; name: string | null; email: string } | null
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

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}

function getDueDateStatus(dueDate: string | null): 'overdue' | 'soon' | 'ok' | null {
  if (!dueDate) return null
  const now  = new Date()
  const due  = new Date(dueDate)
  const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diff < 0)  return 'overdue'
  if (diff <= 3) return 'soon'
  return 'ok'
}

const DUE_STYLES = {
  overdue: 'bg-red-100    text-red-700   dark:bg-red-900   dark:text-red-300',
  soon:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  ok:      'bg-green-50   text-green-700 dark:bg-green-900  dark:text-green-300',
}

// ── 5D: helpers de checkboxes ─────────────────────────────────────────────────

type CheckboxItem = {
  lineIndex: number
  label: string
  checked: boolean
}

function parseCheckboxes(text: string | null): { total: number; done: number; items: CheckboxItem[] } {
  if (!text) return { total: 0, done: 0, items: [] }
  const items: CheckboxItem[] = []
  text.split('\n').forEach((line, i) => {
    const unchecked = line.match(/^- \[ \] (.+)/)
    const checked   = line.match(/^- \[x\] (.+)/i)
    if (unchecked) items.push({ lineIndex: i, label: unchecked[1], checked: false })
    if (checked)   items.push({ lineIndex: i, label: checked[1],   checked: true  })
  })
  return { total: items.length, done: items.filter(i => i.checked).length, items }
}

function toggleLine(text: string, lineIndex: number, wasChecked: boolean): string {
  const lines = text.split('\n')
  lines[lineIndex] = wasChecked
    ? lines[lineIndex].replace(/^- \[x\] /i, '- [ ] ')
    : lines[lineIndex].replace(/^- \[ \] /,   '- [x] ')
  return lines.join('\n')
}

// ── 5D: barra de progreso ─────────────────────────────────────────────────────

function ProgressBar({ done, total }: { done: number; total: number }) {
  if (total === 0) return null
  const pct = Math.round((done / total) * 100)
  const color = 'bg-blue-500'
  return (
    <div className="mt-2 mb-1">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>Progreso</span>
        <span className="font-semibold">{done}/{total} ({pct}%)</span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

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
  const [currentDesc, setCurrentDesc]         = useState(card.description ?? '')
  const [saving, setSaving]                   = useState(false)

  // ← 5D fix: sincronizar descripción local cuando el padre recarga la tarjeta
  useEffect(() => {
    setCurrentDesc(card.description ?? '')
  }, [card.description])

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const p         = getPriority(currentPriority)
  const dueStatus = getDueDateStatus(card.dueDate)

  const resourceLinks = card.resources
    ? card.resources.split('\n').map(u => u.trim()).filter(Boolean)
    : []

  // ── 5D: checkboxes parseados desde la descripción local ──
  const { total, done, items: checkboxItems } = parseCheckboxes(currentDesc)
  const hasCheckboxes = total > 0

  // ── Ciclar prioridad ──
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

  // ── 5D: toggle de un checkbox ──
  const handleToggleCheckbox = async (e: React.MouseEvent, item: CheckboxItem) => {
    e.stopPropagation()
    if (saving) return
    const newDesc = toggleLine(currentDesc, item.lineIndex, item.checked)
    setSaving(true)
    setCurrentDesc(newDesc)
    try {
      await fetch(`/api/cards/${card.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newDesc }),
      })
    } catch (err) {
      console.error('Error al actualizar checkbox:', err)
      setCurrentDesc(currentDesc) // revertir
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
      {/* Título + botones */}
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

      {/* ── 5D: solo % de progreso, sin listar tareas ── */}
      {hasCheckboxes ? (
        <ProgressBar done={done} total={total} />
      ) : (
        currentDesc && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
            {currentDesc}
          </p>
        )
      )}

      {/* Fecha límite */}
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

      {/* Recursos */}
      {resourceLinks.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {resourceLinks.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-xs text-blue-500 hover:underline truncate max-w-[140px]"
              title={url}
            >
              🔗 Recurso {resourceLinks.length > 1 ? i + 1 : ''}
            </a>
          ))}
        </div>
      )}

      {/* Prioridad + asignado + auditoría */}
      <div className="flex items-center justify-between text-xs mt-2">
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
          <div className="text-gray-400 dark:text-gray-500 text-right leading-tight hidden group-hover:block">
            <div title="Creada">📋 {formatDate(card.createdAt)}</div>
            {card.createdAt !== card.updatedAt && (
              <div title="Última edición">✏️ {formatDate(card.updatedAt)}</div>
            )}
          </div>
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
