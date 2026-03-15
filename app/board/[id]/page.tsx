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
  blockedById: string | null                                           // ← 5E
  blockedBy:   { id: string; title: string; columnId: string } | null // ← 5E
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
  dependsOnId: string | null                              // ← 5E
  dependsOn:   { id: string; name: string } | null       // ← 5E
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
    const days=byMonth.get(mk)!; if (!days.has(dk)) days.set(dk,[])
    days.get(dk)!.push(log)
  }

  return (
    <div className="flex-shrink-0 w-72 bg-[#2d3d35] rounded-lg shadow-md flex flex-col self-start">
      <div className="p-4 border-b-4 border-[#3d5045]">
        <h2 className="font-semibold text-lg text-gray-100">📋 Bitácora</h2>
      </div>
      <div className="overflow-y-auto max-h-[600px] divide-y divide-[#3d5045]">
        {logs.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Sin actividad aún</p>
        ) : Array.from(byMonth.entries()).map(([mk, days]) => {
          const monthOpen = openMonths.has(mk); const firstLog = Array.from(days.values())[0][0]
          return (
            <div key={mk}>
              <button onClick={() => toggleMonth(mk)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-gray-200 hover:bg-[#364840] transition-colors">
                <span>{getMonthLabel(firstLog.createdAt)}</span>
                <span className="text-gray-500">{monthOpen?'▾':'▸'}</span>
              </button>
              {monthOpen && <div className="divide-y divide-[#3d5045]">
                {Array.from(days.entries()).map(([dk, dayLogs]) => {
                  const dayOpen = openDays.has(dk)
                  return (
                    <div key={dk}>
                      <button onClick={() => toggleDay(dk)}
                        className="w-full flex items-center justify-between pl-6 pr-4 py-2 text-xs font-semibold text-gray-400 hover:bg-[#364840] transition-colors">
                        <span>{getDayLabel(dayLogs[0].createdAt)}</span>
                        <span className="text-gray-600">{dayOpen?'▾':'▸'}</span>
                      </button>
                      {dayOpen && <div className="bg-[#263530] pl-8 pr-4 py-2 space-y-3">
                        {dayLogs.map(log => (
                          <div key={log.id} className="text-xs text-gray-300 pb-2 border-b border-[#3d5045] last:border-0">
                            <div className="flex justify-between mb-0.5">
                              <span className="font-medium text-gray-200">{log.user.name||log.user.email}</span>
                              <span className="text-gray-500 ml-2 whitespace-nowrap">{timeAgo(log.createdAt)}</span>
                            </div>
                            <div className="text-gray-400">
                              movió <span className="italic text-gray-300">"{log.cardTitle}"</span>
                              {log.fromCol&&log.toCol&&(<> de <span className="text-blue-400">{log.fromCol}</span>{' → '}<span className="text-green-400">{log.toCol}</span></>)}
                            </div>
                          </div>
                        ))}
                      </div>}
                    </div>
                  )
                })}
              </div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Página principal ──
export default function BoardDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { data: session } = useSession()

  const [board, setBoard]                     = useState<Board | null>(null)
  const [loading, setLoading]                 = useState(true)
  const [showModal, setShowModal]             = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showSprintModal, setShowSprintModal] = useState(false)
  const [modalMode, setModalMode]             = useState<'create' | 'edit'>('create')
  const [formData, setFormData]               = useState<CardFormData>({
    columnId: '', title: '', description: '', priority: '', assignedTo: '',
    dueDate: '', alertDate: '', resources: '',
  })
  const [sprintForm, setSprintForm] = useState({ name: '', description: '', insights: '', dependsOnId: '' })
  const [boardsForSelect, setBoardsForSelect] = useState<{ id: string; name: string }[]>([])  // ← 5E
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [activeCard, setActiveCard] = useState<Card | null>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)

  // ← 5E: estado de selección de prelación
  const [selectingPredFor, setSelectingPredFor] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => { fetchBoard() }, [])

  // ← 5E: ESC cancela el modo de selección
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

  // ← 5E: cargar lista de sprints para el dropdown del modal
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
    setFormData({ columnId, title: '', description: '', priority: '', assignedTo: '', dueDate: '', alertDate: '', resources: '' })
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
      if (!res.ok) { const d=await res.json(); setError(d.error||'Error al guardar tarjeta'); setSaving(false); return }
      setShowModal(false); fetchBoard()
    } catch { setError('Error al guardar tarjeta') }
    finally { setSaving(false) }
  }

  const handleDelete = async (cardId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta tarjeta?')) return
    try { const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' }); if (res.ok) fetchBoard() }
    catch (e) { console.error('Error al eliminar:', e) }
  }

  const handleKickMember = async (userId: string, userName: string) => {
    if (!confirm(`¿Retirar a ${userName} del sprint?`)) return
    const res = await fetch(`/api/boards/${board!.id}/members/${userId}`, { method: 'DELETE' })
    if (res.ok) fetchBoard()
  }

  const handleEditSprint = () => {
    if (!board) return
    setSprintForm({ name: board.name, description: board.description||'', insights: board.insights||'', dependsOnId: board.dependsOnId||'' })
    fetchBoardsForSelect()  // ← 5E
    setShowSprintModal(true)
  }

  const handleSaveSprint = async () => {
    if (!board || !sprintForm.name) return
    setSaving(true)
    try {
      const res = await fetch(`/api/boards/${board.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sprintForm, dependsOnId: sprintForm.dependsOnId || null }),  // ← 5E
      })
      if (res.ok) { setShowSprintModal(false); fetchBoard() }
    } catch (e) { console.error('Error al guardar sprint:', e) }
    finally { setSaving(false) }
  }

  // ── 5E: handlers de prelación de tarjetas ──
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

  const isOwner    = session?.user?.id === board.owner.id
  const allMembers = [board.owner, ...board.members.map(m => m.user)]
  const allCards   = board.columns.flatMap(c => c.cards)
  const cardTimes  = allCards.map(c => new Date(c.createdAt).getTime())
  const dueTimes   = allCards.filter(c => c.dueDate).map(c => new Date(c.dueDate!).getTime())
  const lapsoStart = cardTimes.length > 0 ? formatDate(new Date(Math.min(...cardTimes)).toISOString()) : null
  const lapsoEnd   = dueTimes.length  > 0 ? formatDate(new Date(Math.max(...dueTimes)).toISOString())  : null

  // ← 5E: última columna = columna "hecho"
  const lastColId = board.columns[board.columns.length - 1]?.id || ''

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <AppHeader />

        <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

          {/* Encabezado del Sprint */}
          <div className="mb-8">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500">Sprint</span>
                  {isOwner && (
                    <button onClick={handleEditSprint} className="text-xs text-gray-400 hover:text-indigo-500 transition-colors" title="Editar sprint">✏️</button>
                  )}
                </div>
                <h1 className="text-3xl font-bold mb-2">{board.name}</h1>
                {board.description && <p className="text-gray-600 dark:text-gray-400 mb-2">{board.description}</p>}
                {(lapsoStart||lapsoEnd) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    📅 Lapso: <strong>{lapsoStart||'—'}</strong> → <strong>{lapsoEnd||'sin fecha límite'}</strong>
                  </p>
                )}
                {/* ← 5E: badge de prelación del sprint */}
                {board.dependsOn && (
                  <div className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm px-3 py-1.5 rounded-lg mb-2">
                    <span>⏳ Requiere completar primero:</span>
                    <strong>{board.dependsOn.name}</strong>
                  </div>
                )}
                {board.insights && (
                  <div className="mt-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-3 max-w-2xl">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">💡 Insights</p>
                    <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-line">{board.insights}</p>
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                  <span>Propietario: {board.owner.name||board.owner.email}</span>
                  <span>•</span>
                  <span>{allCards.length} tarjetas</span>
                </div>
              </div>
              {isOwner && (
                <button onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium text-sm">
                  📨 Invitar usuario
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">Equipo:</span>
              <span className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs px-3 py-1 rounded-full">
                👑 {board.owner.name||board.owner.email}
              </span>
              {board.members.filter(m => m.user.id !== board.owner.id).map(member => (
                <span key={member.user.id} className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs px-3 py-1 rounded-full">
                  🤝 {member.user.name||member.user.email}
                  {isOwner && (
                    <button onClick={() => handleKickMember(member.user.id, member.user.name||member.user.email)}
                      className="ml-1 text-red-400 hover:text-red-600 font-bold leading-none" title="Retirar del sprint">×</button>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* ← 5E: banner de modo prelación */}
          {selectingPredFor && (
            <div className="mb-4 flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg px-4 py-3">
              <span className="text-amber-700 dark:text-amber-300 text-sm font-medium">
                🔗 Modo prelación activo — haz clic en la tarjeta que prela a <strong>"{allCards.find(c=>c.id===selectingPredFor)?.title}"</strong>
              </span>
              <button onClick={() => setSelectingPredFor(null)}
                className="ml-auto text-xs text-amber-600 hover:text-amber-800 font-medium underline">
                Cancelar (ESC)
              </button>
            </div>
          )}

          {/* Columnas Kanban + Actividad */}
          <div className="flex gap-6 overflow-x-auto pb-4 items-start justify-center">
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

      {/* Drag Overlay */}
      <DragOverlay>
        {activeCard ? (
          <div className="w-80 bg-white dark:bg-gray-700 border-2 border-blue-500 rounded-lg p-4 shadow-xl opacity-90 rotate-3">
            <h3 className="font-medium mb-2">{activeCard.title}</h3>
            {activeCard.description && <p className="text-sm text-gray-600 dark:text-gray-400">{activeCard.description}</p>}
          </div>
        ) : null}
      </DragOverlay>

      {/* ── Modal Crear / Editar Tarjeta ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 my-4">
            <h2 className="text-xl font-bold mb-4">{modalMode==='create' ? 'Nueva Tarjeta' : 'Editar Tarjeta'}</h2>
            {/* ← 5D: barra de progreso en modal */}
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
                  placeholder="Título de la tarjeta" />
              </div>
              {/* Descripción con botones de tarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium">Descripción</label>
                  <div className="flex gap-1">
                    <button type="button" title="Insertar tarea por hacer"
                      onClick={() => {
                        const ta=descRef.current; if (!ta) return
                        const pos=ta.selectionStart??formData.description.length
                        const lines=formData.description.split('\n')
                        let cc=0,li=0; for(let i=0;i<lines.length;i++){cc+=lines[i].length+1;if(cc>pos){li=i;break}}
                        if (lines[li].match(/^- \[x\] /i)) {
                          lines[li]=lines[li].replace(/^- \[x\] /i,'- [ ] ')
                          setFormData({...formData,description:lines.join('\n')})
                          setTimeout(()=>{ta.focus();ta.setSelectionRange(pos,pos)},0)
                        } else {
                          const before=formData.description.substring(0,pos),after=formData.description.substring(pos)
                          const prefix=(before.length>0&&!before.endsWith('\n'))?'\n':''
                          const insert=`${prefix}- [ ] `
                          setFormData({...formData,description:before+insert+after})
                          setTimeout(()=>{ta.focus();ta.setSelectionRange(pos+insert.length,pos+insert.length)},0)
                        }
                      }}
                      className="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-2 py-1 rounded font-medium">
                      ☐ Por hacer
                    </button>
                    <button type="button" title="Marcar tarea como hecha"
                      onClick={() => {
                        const ta=descRef.current; if (!ta) return
                        const pos=ta.selectionStart??formData.description.length
                        const lines=formData.description.split('\n')
                        let cc=0,li=0; for(let i=0;i<lines.length;i++){cc+=lines[i].length+1;if(cc>pos){li=i;break}}
                        if (lines[li].match(/^- \[ \] /)) {
                          lines[li]=lines[li].replace('- [ ] ','- [x] ')
                          setFormData({...formData,description:lines.join('\n')})
                          setTimeout(()=>{ta.focus();ta.setSelectionRange(pos,pos)},0)
                        } else {
                          const before=formData.description.substring(0,pos),after=formData.description.substring(pos)
                          const prefix=(before.length>0&&!before.endsWith('\n'))?'\n':''
                          const insert=`${prefix}- [x] `
                          setFormData({...formData,description:before+insert+after})
                          setTimeout(()=>{ta.focus();ta.setSelectionRange(pos+insert.length,pos+insert.length)},0)
                        }
                      }}
                      className="text-xs text-green-700 hover:text-green-800 dark:text-green-400 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 px-2 py-1 rounded font-medium">
                      ✅ Hecho
                    </button>
                  </div>
                </div>
                <textarea ref={descRef} value={formData.description}
                  onChange={e => setFormData({...formData,description:e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3} placeholder="Describe la tarea..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prioridad</label>
                <select value={formData.priority} onChange={e => setFormData({...formData,priority:e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sin prioridad</option>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Asignar a</label>
                <select value={formData.assignedTo} onChange={e => setFormData({...formData,assignedTo:e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Sin asignar</option>
                  {allMembers.map(m => <option key={m.id} value={m.id}>{m.name||m.email}</option>)}
                </select>
                {!formData.assignedTo && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg mt-2">
                    ⚠️ Esta hoja no tiene persona asignada. Completa las definiciones antes de guardar.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">📅 Fecha límite</label>
                  <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData,dueDate:e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm [color-scheme:light] dark:[color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">🔔 Alerta</label>
                  <input type="date" value={formData.alertDate} onChange={e => setFormData({...formData,alertDate:e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm [color-scheme:light] dark:[color-scheme:dark]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">🔗 Recursos (URLs)</label>
                <textarea value={formData.resources} onChange={e => setFormData({...formData,resources:e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  rows={3} placeholder={"https://docs.google.com/...\nhttps://drive.google.com/..."} />
                <p className="text-xs text-gray-400 mt-1">Una URL por línea</p>
              </div>
              {error && <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg"><p className="text-sm text-red-800 dark:text-red-200">{error}</p></div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
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
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
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
              {/* ← 5E: prelación entre sprints */}
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

// ── Columna Droppable ──
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
          + Agregar Tarjeta
        </button>
      </div>
      <div className="p-4 space-y-3 min-h-[200px]">
        <SortableContext items={column.cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {column.cards.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Arrastra tarjetas aquí</p>
          ) : column.cards.map(card => {
            // ← 5E: calcular si está realmente bloqueada
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
