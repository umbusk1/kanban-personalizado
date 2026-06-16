"use client"

import { useEffect, useState, useRef } from "react"
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
  dueDate:     string | null
  alertDate:   string | null
  resources:   string | null
  blockedById: string | null
  blockedBy:   { id: string; title: string; columnId: string } | null
  assignee: { id: string; name: string | null; email: string } | null
  creator:  { id: string; name: string | null; email: string } | null
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
  insights:    string | null
  dependsOnId: string | null
  dependsOn:   { id: string; name: string } | null
  bonsaiId:    string | null
  bonsai:      { id: string; name: string } | null
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
  dueDate:     string
  alertDate:   string
  resources:   string
}

type LogEntry = {
  id: string
  cardTitle: string
  fromCol:   string | null
  toCol:     string | null
  createdAt: string
  user: { name: string | null; email: string }
}

// ── Helpers ──
function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

const MESES_LOG = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
                   'Agosto','Septiembre','Octubre','Noviembre','Diciembre']

// ── Bitácora ──
function ActivityColumn({ boardId }: { boardId: string }) {
  const [logs, setLogs]             = useState<LogEntry[]>([])
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set())
  const [openDays, setOpenDays]     = useState<Set<string>>(new Set())

  useEffect(() => {
    const fetchLogs = async () => {
      const res = await fetch(`/api/boards/${boardId}/activity`)
      if (res.ok) { const data = await res.json(); setLogs(data); setOpenMonths(new Set()); setOpenDays(new Set()) }
    }
    fetchLogs()
    const interval = setInterval(fetchLogs, 15000)
    return () => clearInterval(interval)
  }, [boardId])

  const getMonthKey   = (d: string) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()).padStart(2,'0')}` }
  const getMonthLabel = (d: string) => { const x = new Date(d); return `${MESES_LOG[x.getMonth()]} ${x.getFullYear()}` }
  const getDayKey     = (d: string) => new Date(d).toDateString()
  const getDayLabel   = (d: string) => {
    const x = new Date(d); const t = new Date(); const y = new Date(t); y.setDate(t.getDate()-1)
    if (x.toDateString() === t.toDateString()) return 'Hoy'
    if (x.toDateString() === y.toDateString()) return 'Ayer'
    return x.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
  }
  const timeAgo = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000)
    if (diff < 60) return `hace ${diff}s`; if (diff < 3600) return `hace ${Math.floor(diff/60)}m`; return `hace ${Math.floor(diff/3600)}h`
  }
  const toggleMonth = (k: string) => setOpenMonths(p => { const n=new Set(p); n.has(k)?n.delete(k):n.add(k); return n })
  const toggleDay   = (k: string) => setOpenDays  (p => { const n=new Set(p); n.has(k)?n.delete(k):n.add(k); return n })

  const byMonth = new Map<string, Map<string, LogEntry[]>>()
  for (const log of logs) {
    const mk=getMonthKey(log.createdAt), dk=getDayKey(log.createdAt)
    if (!byMonth.has(mk)) byMonth.set(mk, new Map())
    const days=byMonth.get(mk)!
    if (!days.has(dk)) days.set(dk,[])
    days.get(dk)!.push(log)
  }

  return (
    <div className="flex-shrink-0 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-md self-start">
      <div className="p-4 border-b-4 border-gray-300 dark:border-gray-600">
        <h2 className="font-semibold text-lg">📋 Bitácora</h2>
        <p className="text-xs text-gray-400 mt-1">{logs.length} eventos</p>
      </div>
      <div className="p-3 max-h-[600px] overflow-y-auto space-y-1">
        {logs.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">Sin actividad aún</p>
        ) : Array.from(byMonth.entries()).map(([mk, days]) => (
          <div key={mk}>
            <button onClick={() => toggleMonth(mk)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded capitalize">
              <span>{getMonthLabel(Array.from(days.values())[0][0].createdAt)}</span>
              <span>{openMonths.has(mk)?'▾':'▸'}</span>
            </button>
            {openMonths.has(mk) && Array.from(days.entries()).map(([dk, dayLogs]) => (
              <div key={dk} className="ml-2">
                <button onClick={() => toggleDay(dk)}
                  className="w-full flex items-center justify-between px-2 py-1 text-xs font-semibold text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded">
                  <span>{getDayLabel(dayLogs[0].createdAt)}</span>
                  <span>{openDays.has(dk)?'▾':'▸'}</span>
                </button>
                {openDays.has(dk) && dayLogs.map(log => (
                  <div key={log.id} className="ml-2 px-2 py-1.5 text-xs border-l-2 border-gray-100 dark:border-gray-700">
                    <p className="text-gray-700 dark:text-gray-300">
                      <span className="font-medium">{log.user.name||log.user.email}</span>
                      {log.fromCol && log.toCol ? ` movió "${log.cardTitle}" de ${log.fromCol} → ${log.toCol}` : ` editó "${log.cardTitle}"`}
                    </p>
                    <p className="text-gray-400 mt-0.5">{timeAgo(log.createdAt)}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tarjeta móvil simple (sin drag) ──
function MobileCard({ card, columnId, isBlocked, blockedByTitle, isOwner, columns, onEdit, onDelete, onMove }: {
  card: Card
  columnId: string
  isBlocked: boolean
  blockedByTitle: string | null
  isOwner: boolean
  columns: Column[]
  onEdit: (card: Card, columnId: string) => void
  onDelete: (cardId: string) => void
  onMove: (cardId: string, targetColumnId: string) => void
}) {
  const [showMoveSheet, setShowMoveSheet] = useState(false)

  const PRIORITIES: Record<string, { label: string; badge: string }> = {
    alta:  { label: 'Alta',  badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    media: { label: 'Media', badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    baja:  { label: 'Baja',  badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  }
  const p = card.priority ? PRIORITIES[card.priority] : null

  const lines = (card.description || '').split('\n')
  const total = lines.filter(l => l.match(/^- \[[ x]\] /i)).length
  const done  = lines.filter(l => l.match(/^- \[x\] /i)).length
  const pct   = total > 0 ? Math.round((done/total)*100) : 0

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${
      card.priority === 'alta'  ? 'border-l-red-500' :
      card.priority === 'media' ? 'border-l-yellow-400' :
      card.priority === 'baja'  ? 'border-l-green-400' : 'border-l-gray-300'
    } shadow-sm overflow-hidden ${isBlocked ? 'opacity-60' : ''}`}>

      {isBlocked && blockedByTitle && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 px-3 py-1.5">
          <p className="text-xs text-amber-700 dark:text-amber-300">⏳ Bloqueada por: <strong>{blockedByTitle}</strong></p>
        </div>
      )}

      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{card.title}</p>
        {card.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{card.description.replace(/^- \[[ x]\] /gim, '').substring(0,80)}</p>
        )}
        {total > 0 && (
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{done}/{total} tareas</span><span>{pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${pct===100?'bg-green-500':'bg-blue-500'}`} style={{ width:`${pct}%` }} />
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          {p && <span className={`text-xs px-1.5 py-0.5 rounded ${p.badge}`}>{p.label}</span>}
          {card.dueDate && (
            <span className="text-xs text-gray-400">📅 {formatDate(card.dueDate)}</span>
          )}
          {card.assignee && (
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
              {card.assignee.name || card.assignee.email}
            </span>
          )}
        </div>
      </div>

      {/* Barra de acciones */}
      <div className="border-t border-gray-100 dark:border-gray-700 flex">
        <button onClick={() => onEdit(card, columnId)}
          className="flex-1 py-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
          ✏️ Editar
        </button>
        <button onClick={() => setShowMoveSheet(true)}
          className="flex-1 py-2 text-xs text-green-600 dark:text-green-400 font-medium hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors border-l border-gray-100 dark:border-gray-700">
          ↔️ Mover
        </button>
        {isOwner && (
          <button onClick={() => onDelete(card.id)}
            className="flex-1 py-2 text-xs text-red-500 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-l border-gray-100 dark:border-gray-700">
            🗑️
          </button>
        )}
      </div>

      {/* Bottom sheet para mover */}
      {showMoveSheet && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowMoveSheet(false)}>
          <div className="w-full bg-white dark:bg-gray-800 rounded-t-2xl border-t border-gray-200 dark:border-gray-700 p-4"
               onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center mb-3">
              Mover "{card.title.substring(0,30)}{card.title.length>30?'...':''}"
            </p>
            <div className="space-y-2">
              {columns.map(col => (
                <button key={col.id} onClick={() => { onMove(card.id, col.id); setShowMoveSheet(false) }}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    col.id === columnId
                      ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}>
                  {col.id === columnId ? '📍 ' : ''}{col.name}
                  {col.id === columnId ? ' (actual)' : ` → ${col.cards.length} hoja${col.cards.length!==1?'s':''}`}
                </button>
              ))}
            </div>
            <button onClick={() => setShowMoveSheet(false)}
              className="w-full mt-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BoardPage({ params }: { params: { id: string } }) {
  const router  = useRouter()
  const { data: session } = useSession()
  const descRef = useRef<HTMLTextAreaElement>(null)

  const [board, setBoard]           = useState<Board | null>(null)
  const [loading, setLoading]       = useState(true)
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const [activeColIndex, setActiveColIndex] = useState(0) // para pestañas móvil

  const [showModal, setShowModal]   = useState(false)
  const [modalMode, setModalMode]   = useState<'create'|'edit'>('create')
  const [formData, setFormData]     = useState<CardFormData>({ columnId:'', title:'', description:'', priority:'', assignedTo:'', dueDate:'', alertDate:'', resources:'' })
  const [error, setError]           = useState('')
  const [saving, setSaving]         = useState(false)

  const [showSprintModal, setShowSprintModal]   = useState(false)
  const [sprintForm, setSprintForm]             = useState({ name:'', description:'', insights:'', dependsOnId:'' })
  const [boardsForSelect, setBoardsForSelect]   = useState<{ id: string; name: string }[]>([])

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [selectingPredFor, setSelectingPredFor] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => { fetchBoard() }, [])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectingPredFor(null) }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  const fetchBoard = async () => {
    try {
      const res = await fetch(`/api/boards/${params.id}`)
      if (res.ok) setBoard(await res.json())
      else router.push('/dashboard')
    } catch (e) { console.error('Error:', e) }
    finally { setLoading(false) }
  }

  const fetchBoardsForSelect = async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (res.ok) {
        const data = await res.json()
        setBoardsForSelect((data.boards || []).filter((b: { id: string; name: string }) => b.id !== params.id))
      }
    } catch (e) { console.error('Error fetching boards:', e) }
  }

  const handleCreateCard = (columnId: string) => {
    setModalMode('create')
    setFormData({ columnId, title:'', description:'', priority:'', assignedTo:'', dueDate:'', alertDate:'', resources:'' })
    setShowModal(true); setError('')
  }

  const handleEditCard = (card: Card, columnId: string) => {
    setModalMode('edit')
    setFormData({
      id: card.id, columnId,
      title:       card.title,
      description: card.description  || '',
      priority:    card.priority     || '',
      assignedTo:  card.assignee?.id || '',
      dueDate:     card.dueDate   ? card.dueDate.substring(0,10)   : '',
      alertDate:   card.alertDate ? card.alertDate.substring(0,10) : '',
      resources:   card.resources || '',
    })
    setShowModal(true); setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      const url    = modalMode === 'create' ? '/api/cards' : `/api/cards/${formData.id}`
      const method = modalMode === 'create' ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, assignedTo: formData.assignedTo||null, dueDate: formData.dueDate||null, alertDate: formData.alertDate||null, resources: formData.resources||null }),
      })
      if (!res.ok) { const d=await res.json(); setError(d.error||'Error al guardar hoja'); setSaving(false); return }
      setShowModal(false); fetchBoard()
    } catch { setError('Error al guardar hoja') }
    finally { setSaving(false) }
  }

  const handleDelete = async (cardId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta hoja?')) return
    try { const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' }); if (res.ok) fetchBoard() }
    catch (e) { console.error('Error al eliminar:', e) }
  }

  const handleMoveCard = async (cardId: string, targetColumnId: string) => {
    try {
      const res = await fetch(`/api/cards/${cardId}/move`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId: targetColumnId, position: 1 }),
      })
      if (res.ok) fetchBoard()
    } catch (e) { console.error('Error al mover:', e) }
  }

  const handleEditSprint = () => {
    if (!board) return
    setSprintForm({ name: board.name, description: board.description||'', insights: board.insights||'', dependsOnId: board.dependsOnId||'' })
    fetchBoardsForSelect()
    setShowSprintModal(true)
  }

  const handleSaveSprint = async () => {
    if (!board || !sprintForm.name) return
    setSaving(true)
    try {
      const res = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sprintForm, dependsOnId: sprintForm.dependsOnId || null }),
      })
      if (res.ok) { setShowSprintModal(false); fetchBoard() }
    } catch (e) { console.error('Error al guardar sprint:', e) }
    finally { setSaving(false) }
  }

  const handlePClick = (cardId: string) => {
    setSelectingPredFor(prev => prev === cardId ? null : cardId)
  }

  const handleSelectAsPred = async (predId: string) => {
    if (!selectingPredFor) return
    const depId = selectingPredFor
    setSelectingPredFor(null)
    try {
      await fetch(`/api/cards/${depId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedById: predId }),
      })
      fetchBoard()
    } catch (e) { console.error('Error al establecer prelación:', e) }
  }

  const handleClearPred = async (cardId: string) => {
    try {
      await fetch(`/api/cards/${cardId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedById: null }),
      })
      fetchBoard()
    } catch (e) { console.error('Error al limpiar prelación:', e) }
  }

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = event.active.id as string
    for (const col of board?.columns||[]) {
      const card = col.cards.find(c => c.id === cardId)
      if (card) { setActiveCard(card); break }
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event; setActiveCard(null)
    if (!over || !board) return
    const cardId=active.id as string, overId=over.id as string
    let srcCol: Column|undefined
    for (const col of board.columns) { if (col.cards.find(c=>c.id===cardId)) { srcCol=col; break } }
    if (!srcCol) return
    let targetColId=overId, isOverCard=false
    for (const col of board.columns) { if (col.cards.some(c=>c.id===overId)) { targetColId=col.id; isOverCard=true; break } }
    if (isOverCard && targetColId===srcCol.id) {
      const oldIdx=srcCol.cards.findIndex(c=>c.id===cardId), newIdx=srcCol.cards.findIndex(c=>c.id===overId)
      if (oldIdx!==newIdx) setBoard({ ...board, columns: board.columns.map(col => col.id===srcCol!.id ? { ...col, cards: arrayMove(col.cards,oldIdx,newIdx) } : col) })
      return
    }
    if (targetColId!==srcCol.id) {
      try {
        const res = await fetch(`/api/cards/${cardId}/move`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ columnId: targetColId, position: 1 }) })
        if (res.ok) fetchBoard()
      } catch (e) { console.error('Error al mover:', e) }
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p>Cargando...</p></div>
  if (!board)  return <div className="min-h-screen flex items-center justify-center"><p>Sprint no encontrado</p></div>

  const isOwner = session?.user?.id === board.owner.id || session?.user?.email === board.owner.email
  const allMembers = [board.owner, ...board.members.map(m => m.user)]
  const allCards   = board.columns.flatMap(c => c.cards)
  const cardTimes  = allCards.map(c => new Date(c.createdAt).getTime())
  const dueTimes   = allCards.filter(c => c.dueDate).map(c => new Date(c.dueDate!).getTime())
  const lapsoStart = cardTimes.length > 0 ? formatDate(new Date(Math.min(...cardTimes)).toISOString()) : null
  const lapsoEnd   = dueTimes.length  > 0 ? formatDate(new Date(Math.max(...dueTimes)).toISOString())  : null
  const lastColId  = board.columns[board.columns.length - 1]?.id || ''
  const activeColumn = board.columns[activeColIndex] || board.columns[0]

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="sticky top-0 z-30"><AppHeader /></div>

        <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">

          {/* Encabezado del Sprint */}
          <div className="mb-6">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {board.bonsai && (
                    <>
                      <a href={`/bonsais?id=${board.bonsai.id}`}
                        className="text-xs font-semibold uppercase tracking-wider text-amber-500 hover:text-amber-600 transition-colors">
                        🌳 {board.bonsai.name}
                      </a>
                      <span className="text-gray-300 dark:text-gray-600">›</span>
                    </>
                  )}
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Sprint</span>
                  {isOwner && (
                    <button onClick={handleEditSprint} className="text-xs text-gray-400 hover:text-indigo-500 transition-colors" title="Editar sprint">✏️</button>
                  )}
                </div>
                <h1 className="text-xl sm:text-3xl font-bold mb-1">{board.name}</h1>
                {board.description && <p className="text-gray-600 dark:text-gray-400 mb-1 text-sm">{board.description}</p>}
                {(lapsoStart||lapsoEnd) && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    📅 Lapso: <strong>{lapsoStart||'—'}</strong> → <strong>{lapsoEnd||'sin fecha límite'}</strong>
                  </p>
                )}
                {board.dependsOn && (
                  <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-xs px-3 py-1.5 rounded-lg mb-1">
                    <span>⏳ Requiere completar primero:</span>
                    <strong>{board.dependsOn.name}</strong>
                  </div>
                )}
                {board.insights && (
                  <div className="mt-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-2 max-w-2xl">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">💡 Insights</p>
                    <p className="text-xs text-amber-900 dark:text-amber-200 whitespace-pre-line">{board.insights}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {isOwner && (
                  <button onClick={() => setShowInviteModal(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors">
                    👥 <span className="hidden sm:inline">Invitar</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {selectingPredFor && (
            <div className="mb-4 flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg px-4 py-3">
              <span className="text-amber-700 dark:text-amber-300 text-sm font-medium">
                🔗 Modo prelación activo — haz clic en la hoja que prela a <strong>"{allCards.find(c=>c.id===selectingPredFor)?.title}"</strong>
              </span>
              <button onClick={() => setSelectingPredFor(null)}
                className="ml-auto text-xs text-amber-600 hover:text-amber-800 font-medium underline">
                Cancelar (ESC)
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════
              VISTA MÓVIL — pestañas por columna
          ════════════════════════════════════════ */}
          <div className="md:hidden">
            {/* Pestañas */}
            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 -mx-4 px-4 overflow-x-auto">
              {board.columns.map((col, idx) => (
                <button key={col.id} onClick={() => setActiveColIndex(idx)}
                  className={`flex-1 px-2 py-2.5 text-sm font-medium border-b-2 transition-colors text-center leading-tight ${
                    idx === activeColIndex
                      ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}>
                  <span className={`block text-lg font-bold mb-0.5 px-2 py-0.5 rounded-full mx-auto w-fit ${
                    idx === activeColIndex
                      ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                  }`}>
                    {col.cards.length}
                  </span>
                  <span className="block text-xs">{col.name}</span>
                </button>
              ))}
            </div>

            {/* Contenido de la columna activa */}
            {activeColumn && (
              <div>
                <button onClick={() => handleCreateCard(activeColumn.id)}
                  className="w-full mb-3 py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-500 transition-colors">
                  + Agregar Hoja en {activeColumn.name}
                </button>
                <div className="space-y-3">
                  {activeColumn.cards.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <p className="text-3xl mb-2">📋</p>
                      <p className="text-sm">No hay hojas en esta columna</p>
                    </div>
                  ) : activeColumn.cards.map(card => {
                    const isBlocked = !!card.blockedById && card.blockedBy !== null && card.blockedBy.columnId !== lastColId
                    return (
                      <MobileCard
                        key={card.id}
                        card={card}
                        columnId={activeColumn.id}
                        isBlocked={isBlocked}
                        blockedByTitle={card.blockedBy?.title || null}
                        isOwner={isOwner}
                        columns={board.columns}
                        onEdit={handleEditCard}
                        onDelete={handleDelete}
                        onMove={handleMoveCard}
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════
              VISTA DESKTOP — columnas + drag & drop
          ════════════════════════════════════════ */}
          <div className="hidden md:flex gap-6 overflow-x-auto pb-4 items-start justify-center">
            {board.columns.map(col => (
              <DroppableColumn
                key={col.id}
                column={col}
                isOwner={isOwner}
                lastColId={lastColId}
                selectingPredFor={selectingPredFor}
                onCreateCard={handleCreateCard}
                onEditCard={handleEditCard}
                onDeleteCard={handleDelete}
                onPClick={handlePClick}
                onSelectAsPred={handleSelectAsPred}
                onClearPred={handleClearPred}
              />
            ))}
            <ActivityColumn boardId={board.id} />
          </div>

        </main>

        <AppFooter />
      </div>

      {/* Drag Overlay — solo desktop */}
      <DragOverlay>
        {activeCard ? (
          <div className="w-80 bg-white dark:bg-gray-700 border-2 border-blue-500 rounded-lg p-4 shadow-xl opacity-90 rotate-3">
            <h3 className="font-medium mb-2">{activeCard.title}</h3>
            {activeCard.description && <p className="text-sm text-gray-600 dark:text-gray-400">{activeCard.description}</p>}
          </div>
        ) : null}
      </DragOverlay>

      {/* ── Modal Crear / Editar hoja ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg w-full sm:max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="w-10 h-1 bg-gray-200 dark:bg-gray-600 rounded-full mx-auto mb-4 sm:hidden" />
            <h2 className="text-xl font-bold mb-4">{modalMode==='create' ? 'Nueva Hoja' : 'Editar Hoja'}</h2>
            {(() => {
              const lines = formData.description.split('\n')
              const total = lines.filter(l => l.match(/^- \[[ x]\] /i)).length
              const done  = lines.filter(l => l.match(/^- \[x\] /i)).length
              if (total===0) return null
              const pct=Math.round((done/total)*100), color=pct===100?'bg-green-500':pct>=50?'bg-blue-500':'bg-amber-400'
              return (
                <div className="mb-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg px-4 py-3">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                    <span>Progreso de tareas</span><span className="font-semibold">{done}/{total} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })()}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Título *</label>
                <input type="text" required value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Título de la hoja" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">Descripción</label>
                  <div className="flex gap-1">
                    <button type="button" title="Marcar tarea como pendiente"
                      onClick={() => {
                        const newD = formData.description.replace(/^- \[x\] /mi, '- [ ] ')
                        setFormData({...formData, description: newD})
                      }}
                      className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded font-mono">
                      ☐ Por hacer
                    </button>
                    <button type="button" title="Marcar tarea como hecha"
                      onClick={() => {
                        const newD = formData.description.replace(/^- \[ \] /m, '- [x] ')
                        setFormData({...formData, description: newD})
                      }}
                      className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded font-mono">
                      ☑ Hecho
                    </button>
                  </div>
                </div>
                <textarea ref={descRef} value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows={4} placeholder="Descripción o subtareas:&#10;- [ ] Tarea pendiente&#10;- [x] Tarea completada" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Prioridad</label>
                  <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Sin prioridad</option>
                    <option value="baja">🟢 Baja</option>
                    <option value="media">🟡 Media</option>
                    <option value="alta">🔴 Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Asignar a</label>
                  <select value={formData.assignedTo} onChange={e => setFormData({...formData, assignedTo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Sin asignar</option>
                    {allMembers.map(m => <option key={m.id} value={m.id}>{m.name||m.email}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha límite</label>
                  <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})}
                    className="w-full px-3 py-2 h-[42px] border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fecha de alerta</label>
                  <input type="date" value={formData.alertDate} onChange={e => setFormData({...formData, alertDate: e.target.value})}
                    className="w-full px-3 py-2 h-[42px] border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Recursos (URLs, uno por línea)</label>
                <textarea value={formData.resources} onChange={e => setFormData({...formData, resources: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  rows={2} placeholder="https://..." />
              </div>
              {error && <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg"><p className="text-sm text-red-800 dark:text-red-200">{error}</p></div>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving||!formData.title.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Guardando...' : modalMode==='create' ? 'Crear' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Editar Sprint ── */}
      {showSprintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">✏️ Editar Sprint</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input type="text" value={sprintForm.name} onChange={e => setSprintForm({...sprintForm,name:e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción</label>
                <textarea value={sprintForm.description} onChange={e => setSprintForm({...sprintForm,description:e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">💡 Insights (lecciones aprendidas)</label>
                <textarea value={sprintForm.insights} onChange={e => setSprintForm({...sprintForm,insights:e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={4} placeholder="¿Qué aprendimos en este sprint?" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">⏳ Este sprint requiere completar primero</label>
                <select value={sprintForm.dependsOnId} onChange={e => setSprintForm({...sprintForm,dependsOnId:e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Sin prelación</option>
                  {boardsForSelect.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowSprintModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancelar
                </button>
                <button onClick={handleSaveSprint} disabled={saving||!sprintForm.name}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && <InviteModal boardId={board.id} onClose={() => setShowInviteModal(false)} />}
    </DndContext>
  )
}

// ── Columna Droppable (solo desktop) ──
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { DraggableCard } from "./DraggableCard"

function DroppableColumn({
  column, isOwner, lastColId, selectingPredFor,
  onCreateCard, onEditCard, onDeleteCard, onPClick, onSelectAsPred, onClearPred,
}: {
  column: Column
  isOwner: boolean
  lastColId: string
  selectingPredFor: string | null
  onCreateCard: (columnId: string) => void
  onEditCard: (card: Card, columnId: string) => void
  onDeleteCard: (cardId: string) => void
  onPClick: (cardId: string) => void
  onSelectAsPred: (predId: string) => void
  onClearPred: (cardId: string) => void
}) {
  const { setNodeRef } = useDroppable({ id: column.id })

  return (
    <div ref={setNodeRef} className="flex-shrink-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="p-4 border-b-4" style={{ borderColor: column.color || '#6b7280' }}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-lg">{column.name}</h2>
        </div>
        <button onClick={() => onCreateCard(column.id)} className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
          + Agregar Hoja
        </button>
      </div>
      <div className="p-4 space-y-3 min-h-[200px]">
        <SortableContext items={column.cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {column.cards.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Arrastra hojas aquí</p>
          ) : column.cards.map(card => {
            const isBlocked = !!card.blockedById && card.blockedBy !== null && card.blockedBy.columnId !== lastColId
            return (
              <DraggableCard
                key={card.id}
                card={card}
                columnId={column.id}
                isBlocked={isBlocked}
                blockedByTitle={card.blockedBy?.title || null}
                selectingPredFor={selectingPredFor}
                onEdit={onEditCard}
                onDelete={onDeleteCard}
                onPClick={onPClick}
                onSelectAsPred={onSelectAsPred}
                onClearPred={onClearPred}
              />
            )
          })}
        </SortableContext>
      </div>
    </div>
  )
}
