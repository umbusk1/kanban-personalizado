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
  dueDate:     string | null
  alertDate:   string | null
  resources:   string | null
  blockedById: string | null                                          // ← 5E
  blockedBy:  { id: string; title: string; columnId: string } | null // ← 5E
  assignee: { id: string; name: string | null; email: string } | null
  creator:  { id: string; name: string | null; email: string } | null
}

const PRIORITIES = [
  { value: '',      label: 'Sin prioridad', icon: '⚪', border: 'border-l-gray-300  dark:border-l-gray-600', badge: 'bg-gray-100  text-gray-500  dark:bg-gray-700 dark:text-gray-400' },
  { value: 'baja',  label: 'Baja',          icon: '🟢', border: 'border-l-green-400 dark:border-l-green-500', badge: 'bg-green-100  text-green-800 dark:bg-green-900  dark:text-green-200' },
  { value: 'media', label: 'Media',         icon: '🟡', border: 'border-l-yellow-400 dark:border-l-yellow-400', badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'alta',  label: 'Alta',          icon: '🔴', border: 'border-l-red-500   dark:border-l-red-400',   badge: 'bg-red-100    text-red-800   dark:bg-red-900    dark:text-red-200' },
]
function getPriority(v: string | null) {
  return PRIORITIES.find(p => p.value === (v ?? '')) ?? PRIORITIES[0]
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getDueDateStatus(d: string | null): 'overdue' | 'soon' | 'ok' | null {
  if (!d) return null
  const diff = (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (diff < 0)  return 'overdue'
  if (diff <= 3) return 'soon'
  return 'ok'
}
const DUE_STYLES = {
  overdue: 'bg-red-100    text-red-700   dark:bg-red-900   dark:text-red-300',
  soon:    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  ok:      'bg-green-50   text-green-700 dark:bg-green-900  dark:text-green-300',
}

// ── checkboxes ──
type CheckboxItem = { lineIndex: number; label: string; checked: boolean }
function parseCheckboxes(text: string | null) {
  if (!text) return { total: 0, done: 0, items: [] as CheckboxItem[] }
  const items: CheckboxItem[] = []
  text.split('\n').forEach((line, i) => {
    const u = line.match(/^- \[ \] (.+)/);  if (u) items.push({ lineIndex: i, label: u[1], checked: false })
    const c = line.match(/^- \[x\] (.+)/i); if (c) items.push({ lineIndex: i, label: c[1], checked: true  })
  })
  return { total: items.length, done: items.filter(i => i.checked).length, items }
}
function toggleLine(text: string, li: number, wasChecked: boolean) {
  const lines = text.split('\n')
  lines[li] = wasChecked
    ? lines[li].replace(/^- \[x\] /i, '- [ ] ')
    : lines[li].replace(/^- \[ \] /,   '- [x] ')
  return lines.join('\n')
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  if (total === 0) return null
  const pct = Math.round((done / total) * 100)
  return (
    <div className="mt-2 mb-1">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
        <span>Progreso</span>
        <span className="font-semibold">{done}/{total} ({pct}%)</span>
      </div>
      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function DraggableCard({
  card, columnId, isBlocked, blockedByTitle,
  selectingPredFor, onEdit, onDelete, onPClick, onSelectAsPred, onClearPred,
}: {
  card: Card
  columnId: string
  isBlocked: boolean
  blockedByTitle: string | null
  selectingPredFor: string | null
  onEdit: (card: Card, columnId: string) => void
  onDelete: (cardId: string) => void
  onPClick: (cardId: string) => void
  onSelectAsPred: (predId: string) => void
  onClearPred: (cardId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id })

  const [currentPriority, setCurrentPriority] = useState(card.priority ?? '')
  const [currentDesc, setCurrentDesc]         = useState(card.description ?? '')
  const [saving, setSaving]                   = useState(false)

  useEffect(() => { setCurrentDesc(card.description ?? '') }, [card.description])

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  const p         = getPriority(currentPriority)
  const dueStatus = getDueDateStatus(card.dueDate)
  const resourceLinks = card.resources
    ? card.resources.split('\n').map(u => u.trim()).filter(Boolean) : []

  const { total, done } = parseCheckboxes(currentDesc)
  const hasCheckboxes   = total > 0

  // ── 5E: estados de prelación ──
  const isDependent      = selectingPredFor === card.id        // esta hoja busca prelación
  const isTargetable     = selectingPredFor !== null && !isDependent  // puede ser seleccionada como prelación
  const hasPred          = !!card.blockedById

  const handleCyclePriority = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (saving) return
    const idx  = PRIORITIES.findIndex(p => p.value === currentPriority)
    const next = PRIORITIES[(idx + 1) % PRIORITIES.length]
    setSaving(true); setCurrentPriority(next.value)
    try {
      await fetch(`/api/cards/${card.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: next.value || null }),
      })
    } catch { setCurrentPriority(currentPriority) }
    finally { setSaving(false) }
  }

  const handleToggleCheckbox = async (e: React.MouseEvent, item: CheckboxItem) => {
    e.stopPropagation()
    if (saving) return
    const newDesc = toggleLine(currentDesc, item.lineIndex, item.checked)
    setSaving(true); setCurrentDesc(newDesc)
    try {
      await fetch(`/api/cards/${card.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newDesc }),
      })
    } catch { setCurrentDesc(currentDesc) }
    finally { setSaving(false) }
  }

  // ── clases del card según estado de prelación ──
  let cardRingClass = ''
  if (isDependent)  cardRingClass = 'ring-2 ring-amber-400 ring-offset-1'
  if (isBlocked)    cardRingClass = 'opacity-40'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        relative bg-white dark:bg-gray-700
        border border-gray-200 dark:border-gray-600
        border-l-4 ${p.border}
        ${isBlocked ? 'border-dashed' : ''}
        rounded-lg p-4 shadow-sm hover:shadow-md
        transition-all cursor-grab active:cursor-grabbing group
        ${cardRingClass}
      `}
    >
      {/* ── 5E: overlay clicable cuando otra hoja busca prelación ── */}
      {isTargetable && (
        <button
          className="absolute inset-0 z-10 bg-blue-500/10 border-2 border-blue-400 border-dashed rounded-lg
                     flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
          onClick={e => { e.stopPropagation(); onSelectAsPred(card.id) }}
        >
          <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-medium shadow">
            ← Seleccionar como prelación
          </span>
        </button>
      )}

      {/* Título + botones */}
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-medium flex-1 leading-snug pr-6">{card.title}</h3>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute top-3 right-3">
          {/* ← 5E: botón P de prelación */}
          <button
            onClick={e => { e.stopPropagation(); onPClick(card.id) }}
            title={isDependent ? 'Cancelar selección de prelación' : hasPred ? 'Cambiar prelación' : 'Establecer prelación'}
            className={`text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold transition-colors
              ${isDependent
                ? 'bg-amber-400 text-white'
                : hasPred
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-600'
              }`}
          >P</button>
          <button onClick={e => { e.stopPropagation(); onEdit(card, columnId) }}
            className="text-blue-600 hover:text-blue-700 text-xs" title="Editar">✏️</button>
          <button onClick={e => { e.stopPropagation(); onDelete(card.id) }}
            className="text-red-600 hover:text-red-700 text-xs" title="Eliminar">🗑️</button>
        </div>
      </div>

      {/* ── 5E: badge "bloqueada por" ── */}
      {isBlocked && blockedByTitle && (
        <div className="flex items-center gap-1 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700
                        text-red-700 dark:text-red-300 text-xs px-2 py-1 rounded mb-2">
          <span>🔒 Bloqueada por: <strong>{blockedByTitle}</strong></span>
          <button
            onClick={e => { e.stopPropagation(); onClearPred(card.id) }}
            className="ml-auto text-red-400 hover:text-red-600 font-bold leading-none"
            title="Quitar prelación"
          >×</button>
        </div>
      )}

      {/* ── 5E: badge "prela a" (si está en columna final) ── */}
      {!isBlocked && hasPred && blockedByTitle && (
        <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700
                        text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded mb-2">
          <span>✓ Requería: <strong>{blockedByTitle}</strong></span>
          <button
            onClick={e => { e.stopPropagation(); onClearPred(card.id) }}
            className="ml-auto text-blue-400 hover:text-blue-600 font-bold leading-none"
            title="Quitar prelación"
          >×</button>
        </div>
      )}

      {/* Checkboxes / Descripción */}
      {hasCheckboxes ? (
        <ProgressBar done={done} total={total} />
      ) : (
        currentDesc && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{currentDesc}</p>
        )
      )}

      {/* Fecha límite */}
      {card.dueDate && dueStatus && (
        <div className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded mb-2 font-medium ${DUE_STYLES[dueStatus]}`}>
          <span>{dueStatus === 'overdue' ? '⚠️' : '📅'}</span>
          <span>{dueStatus === 'overdue' ? 'Venció ' : 'Límite '}{formatDate(card.dueDate)}</span>
        </div>
      )}

      {/* Recursos */}
      {resourceLinks.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {resourceLinks.map((url, i) => (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-xs text-blue-500 hover:underline truncate max-w-[140px]" title={url}>
              🔗 Recurso {resourceLinks.length > 1 ? i + 1 : ''}
            </a>
          ))}
        </div>
      )}

      {/* Prioridad + asignado + auditoría */}
      <div className="flex items-center justify-between text-xs mt-2">
        <button onClick={handleCyclePriority} disabled={saving} title="Clic para cambiar prioridad"
          className={`flex items-center gap-1 px-2 py-1 rounded font-medium transition-all hover:scale-105 active:scale-95 ${p.badge} ${saving ? 'opacity-50' : ''}`}>
          <span>{p.icon}</span><span>{p.label}</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="text-gray-400 dark:text-gray-500 text-right leading-tight hidden group-hover:block">
            <div title="Creada">📋 {formatDate(card.createdAt)}</div>
            {card.createdAt !== card.updatedAt && (
              <div title="Última edición">✏️ {formatDate(card.updatedAt)}</div>
            )}
          </div>
          {card.assignee && (
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold"
              title={`Asignado: ${card.assignee.name || card.assignee.email}`}>
              {card.assignee.name?.[0]?.toUpperCase() || card.assignee.email[0].toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
