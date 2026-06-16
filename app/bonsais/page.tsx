"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import AppHeader from "@/components/AppHeader"
import AppFooter from "@/components/AppFooter"
import AgenteSprintModal, { GeneratedBoard, GeneratedBonsai } from "@/components/AgenteSprintModal"
import QuotaSurveyModal from "@/components/QuotaSurveyModal"
import InviteModal from "@/components/InviteModal"   // ← NUEVO
import { useSession } from "next-auth/react"

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
               'Agosto','Septiembre','Octubre','Noviembre','Diciembre']

type Sprint = {
  id: string
  name: string
  description: string | null
  createdAt: string
  totalCards: number
  col3Cards: number
  inProgress: boolean
  progress: number
  generatedByAI: boolean
  aiPrompt: string | null
}

type Bonsai = {
  id:            string
  name:          string
  description:   string | null
  createdAt:     string
  generatedByAI: boolean
  aiPrompt:      string | null
  userRole:      "owner" | "member"
  owner:         { id: string; name: string | null; email: string } | null
  sprints: Sprint[]
}

function isCompleted(b: Bonsai) {
  return b.sprints.length > 0 && b.sprints.every(s => !s.inProgress)
}

function groupByMonth(bonsais: Bonsai[]) {
  const map = new Map<string, Bonsai[]>()
  for (const b of bonsais) {
    const d   = new Date(b.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
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

function PromptViewer({ prompt, onRegenerate }: { prompt: string; onRegenerate: (prompt: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-3 border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
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

// ── Tarjeta de Bonsai para móvil ──
function BonsaiCard({ bonsai, onDelete, onAddSprint, onAddSprintAI, onRegenerate, onInvite }: {
  bonsai: Bonsai
  onDelete: (b: Bonsai) => void
  onAddSprint: (b: Bonsai) => void
  onAddSprintAI: (b: Bonsai) => void
  onRegenerate: (prompt: string) => void
  onInvite: (b: Bonsai) => void   // ← NUEVO
}) {
  const [expanded, setExpanded] = useState(false)
  const completed = isCompleted(bonsai)
  const totalSprints = bonsai.sprints.length
  const doneSprints = bonsai.sprints.filter(s => !s.inProgress).length
  const pct = totalSprints === 0 ? 0 : Math.round((doneSprints / totalSprints) * 100)
  const isOwner = bonsai.userRole === "owner"

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden ${
      completed ? "border-green-200 dark:border-green-900" : "border-purple-200 dark:border-purple-900"
    }`}>
      <button onClick={() => setExpanded(e => !e)} className="w-full text-left px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
              🌳 {bonsai.generatedByAI && <span className="text-xs">✨</span>}
              {bonsai.userRole === "member" && (
                <span className="text-green-500 text-xs" title={`Proyecto de ${bonsai.owner?.name || bonsai.owner?.email}`}>🤝</span>
              )}
              <span className="truncate">{bonsai.name}</span>
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                completed
                  ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                  : "bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
              }`}>
                {completed ? "✅ Completado" : "🔄 En proceso"}
              </span>
              {bonsai.userRole === "member" && bonsai.owner && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                  🤝 {bonsai.owner.name || bonsai.owner.email}
                </span>
              )}
              <span className="text-xs text-gray-400">
                {totalSprints} sprint{totalSprints !== 1 ? "s" : ""} · {pct}%
              </span>
            </div>
          </div>
          <span className="text-gray-400 text-sm mt-1">{expanded ? '▾' : '▸'}</span>
        </div>
        {totalSprints > 0 && (
          <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-purple-500"}`}
              style={{ width: `${pct}%` }} />
          </div>
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 space-y-3">
          {bonsai.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{bonsai.description}</p>
          )}
          {bonsai.generatedByAI && bonsai.aiPrompt && (
            <PromptViewer prompt={bonsai.aiPrompt} onRegenerate={onRegenerate} />
          )}

          {bonsai.sprints.length > 0 && (
            <div className="space-y-2">
              {bonsai.sprints.map((sprint, idx) => (
                <div key={sprint.id}
                  className="bg-gray-50 dark:bg-gray-900 rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                      {sprint.generatedByAI && <span className="mr-1">✨</span>}
                      Sprint {idx + 1}: {sprint.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${sprint.progress === 100 ? "bg-green-500" : "bg-indigo-500"}`}
                          style={{ width: `${sprint.progress}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0">{sprint.progress}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Link href={`/board/${sprint.id}`}
                      className="px-2 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                      Abrir
                    </Link>
                    {isOwner && (
                      <button onClick={() => onDelete({ ...bonsai, sprints: [sprint] } as any)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors text-xs">
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Acciones — solo para el dueño */}
          {isOwner && (
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={() => onInvite(bonsai)}   // ← NUEVO
                className="w-full text-center bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors">
                📨 Invitar al proyecto
              </button>
              <button onClick={() => onAddSprintAI(bonsai)}
                className="flex-1 text-center bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors">
                ✨ Sprint con IA
              </button>
              <button onClick={() => onAddSprint(bonsai)}
                className="flex-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors">
                + Sprint manual
              </button>
              <button onClick={() => onDelete(bonsai)}
                className="px-3 py-2 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                🗑️ Eliminar bonsai
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function BonsaisPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [bonsais, setBonsais]         = useState<Bonsai[]>([])
  const [loading, setLoading]         = useState(true)
  const [selected, setSelected]       = useState<Bonsai | null>(null)
  const [openBonsais, setOpenBonsais] = useState<Set<string>>(new Set())
  const [openMonths, setOpenMonths]   = useState<Set<string>>(new Set())

  const [showModal, setShowModal]           = useState(false)
  const [creating, setCreating]             = useState(false)
  const [newName, setNewName]               = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [createError, setCreateError]       = useState("")

  const [showAgenteModal, setShowAgenteModal]             = useState(false)
  const [showAgenteSprintModal, setShowAgenteSprintModal] = useState(false)
  const [agenteInitialPrompt, setAgenteInitialPrompt]     = useState("")
  const [agenteInitialMode, setAgenteInitialMode]         = useState<"sprint" | "bonsai">("bonsai")

  const [showSprintModal, setShowSprintModal]     = useState(false)
  const [creatingSprint, setCreatingSprint]       = useState(false)
  const [newSprintName, setNewSprintName]         = useState("")
  const [newSprintDesc, setNewSprintDesc]         = useState("")
  const [createSprintError, setCreateSprintError] = useState("")

  const [deleteTarget, setDeleteTarget]             = useState<Bonsai | null>(null)
  const [deleting, setDeleting]                     = useState(false)
  const [deleteSprintTarget, setDeleteSprintTarget] = useState<Sprint | null>(null)
  const [deletingSprint, setDeletingSprint]         = useState(false)

  const [showQuotaModal, setShowQuotaModal] = useState(false)
  const [quotaType, setQuotaType]           = useState<"sprint" | "bonsai">("bonsai")

  const [showInviteModal, setShowInviteModal] = useState(false)   // ← NUEVO

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const res = await fetch("/api/bonsais")
      if (res.ok) {
        const data: Bonsai[] = await res.json()
        setBonsais(data)
        const inProgress = data.filter(b => !isCompleted(b))
        setSelected(prev => {
          if (prev) return data.find(b => b.id === prev.id) ?? (inProgress.length > 0 ? inProgress[0] : data[0] ?? null)
          return inProgress.length > 0 ? inProgress[0] : data[0] ?? null
        })
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const toggleBonsai = (id: string) => {
    setOpenBonsais(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const toggleMonth = (key: string) => {
    setOpenMonths(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }

  const monthKey = (b: Bonsai) => {
    const d = new Date(b.createdAt)
    return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
  }

  const handleSelect = (bonsai: Bonsai) => {
    setSelected(bonsai)
    setOpenBonsais(prev => new Set(prev).add(bonsai.id))
  }

  const handleCreateBonsai = async (e: React.FormEvent) => {
    e.preventDefault(); setCreateError(""); setCreating(true)
    try {
      const res = await fetch("/api/bonsais", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDescription }),
      })
      if (!res.ok) { const d = await res.json(); setCreateError(d.error || "Error al crear bonsai"); setCreating(false); return }
      setShowModal(false); setNewName(""); setNewDescription(""); setCreating(false)
      await fetchData()
    } catch { setCreateError("Error al crear bonsai"); setCreating(false) }
  }

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setCreateSprintError(""); setCreatingSprint(true)
    try {
      const res = await fetch("/api/boards", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSprintName, description: newSprintDesc, bonsaiId: selected.id }),
      })
      if (!res.ok) { const d = await res.json(); setCreateSprintError(d.error || "Error al crear sprint"); setCreatingSprint(false); return }
      const newBoard = await res.json()
      setShowSprintModal(false); setNewSprintName(""); setNewSprintDesc(""); setCreatingSprint(false)
      router.push(`/board/${newBoard.id}`)
    } catch { setCreateSprintError("Error al crear sprint"); setCreatingSprint(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/bonsais/${deleteTarget.id}`, { method: "DELETE" })
      if (res.ok) {
        const remaining = bonsais.filter(b => b.id !== deleteTarget.id)
        setBonsais(remaining)
        setSelected(remaining.length > 0 ? remaining[0] : null)
        setDeleteTarget(null)
      }
    } catch { console.error("Error al eliminar bonsai") }
    finally { setDeleting(false) }
  }

  const handleDeleteSprint = async () => {
    if (!deleteSprintTarget) return
    setDeletingSprint(true)
    try {
      const res = await fetch(`/api/boards/${deleteSprintTarget.id}`, { method: "DELETE" })
      if (res.ok) { setDeleteSprintTarget(null); await fetchData() }
    } catch { console.error("Error al eliminar sprint") }
    finally { setDeletingSprint(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"><p>Cargando...</p></div>
  )

  const inProgressBonsais = bonsais.filter(b => !isCompleted(b))
  const completedBonsais  = bonsais.filter(b => isCompleted(b))
  const historico         = groupByMonth(completedBonsais)
  const totalSprints      = bonsais.reduce((sum, b) => sum + b.sprints.length, 0)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="sticky top-0 z-30"><AppHeader /></div>

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">

        <div className="mb-5 flex justify-between items-center gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold mb-0.5">
              Bienvenido, {session?.user?.name || session?.user?.email}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
              {bonsais.length} proyecto{bonsais.length !== 1 ? "s" : ""}
              {totalSprints > 0 && (
                <span className="ml-2 text-indigo-500 font-medium">· {totalSprints} sprint{totalSprints !== 1 ? "s" : ""}</span>
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
              + <span className="hidden sm:inline">Nuevo </span>Bonsai
            </button>
          </div>
        </div>

        {bonsais.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <p className="text-4xl mb-4">🌳</p>
            <p className="text-gray-500 mb-2 text-lg font-medium">Aún no tienes proyectos</p>
            <p className="text-gray-400 text-sm mb-6">Un Bonsai es un proyecto mayor compuesto por múltiples sprints.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowAgenteModal(true)}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 text-sm font-medium">
                ✨ Generar con IA
              </button>
              <button onClick={() => setShowModal(true)}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
                + Crear manualmente
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ════════ VISTA MÓVIL ════════ */}
            <div className="md:hidden space-y-4">
              {inProgressBonsais.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-2 px-1">
                    🌳 En proceso · {inProgressBonsais.length} activos
                  </p>
                  <div className="space-y-2">
                    {inProgressBonsais.map(bonsai => (
                      <BonsaiCard key={bonsai.id} bonsai={bonsai}
                        onDelete={setDeleteTarget}
                        onAddSprint={(b) => { setSelected(b); setShowSprintModal(true) }}
                        onAddSprintAI={(b) => { setSelected(b); setShowAgenteSprintModal(true) }}
                        onInvite={(b) => { setSelected(b); setShowInviteModal(true) }}   // ← NUEVO
                        onRegenerate={(prompt) => {
                          setAgenteInitialPrompt(prompt)
                          setAgenteInitialMode("bonsai")
                          setShowAgenteModal(true)
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              {historico.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 px-1">
                    📚 Histórico · {completedBonsais.length} completados
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
                            {group.items.map(bonsai => (
                              <BonsaiCard key={bonsai.id} bonsai={bonsai}
                                onDelete={setDeleteTarget}
                                onAddSprint={(b) => { setSelected(b); setShowSprintModal(true) }}
                                onAddSprintAI={(b) => { setSelected(b); setShowAgenteSprintModal(true) }}
                                onInvite={(b) => { setSelected(b); setShowInviteModal(true) }}   // ← NUEVO
                                onRegenerate={(prompt) => {
                                  setAgenteInitialPrompt(prompt)
                                  setAgenteInitialMode("bonsai")
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

            {/* ════════ VISTA DESKTOP ════════ */}
            <div className="hidden md:flex gap-5 items-start">

              <aside className="flex-shrink-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden self-start">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/20">
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">🌳 En proceso</p>
                  <p className="text-xs text-indigo-400 mt-0.5">{inProgressBonsais.length} activos</p>
                </div>
                {inProgressBonsais.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6 px-4">Todos los bonsais están completados</p>
                ) : (
                  <ul className="divide-y divide-gray-50 dark:divide-gray-700">
                    {inProgressBonsais.map(bonsai => {
                      const open = openBonsais.has(bonsai.id)
                      const done = bonsai.sprints.filter(s => !s.inProgress).length
                      return (
                        <li key={bonsai.id}>
                          <div className={`flex items-center transition-colors ${
                            selected?.id === bonsai.id
                              ? "bg-indigo-50 dark:bg-indigo-900/30 border-l-4 border-indigo-500"
                              : "border-l-4 border-transparent"
                          }`}>
                            <button onClick={() => handleSelect(bonsai)}
                              className={`flex-1 text-left px-3 py-3 text-sm transition-colors
                                hover:bg-indigo-50 dark:hover:bg-indigo-900/20 ${
                                selected?.id === bonsai.id
                                  ? "text-indigo-700 dark:text-indigo-300 font-semibold"
                                  : "text-gray-700 dark:text-gray-300"
                              }`}>
                              <span className="block truncate text-sm">
                                {bonsai.generatedByAI && (
                                  <span className="mr-1 text-xs" title="Generado con IA">✨</span>
                                )}
                                {bonsai.userRole === "member" && (
                                  <span className="text-green-500 mr-1" title={`Proyecto de ${bonsai.owner?.name || bonsai.owner?.email}`}>🤝</span>
                                )}
                                {bonsai.name}
                              </span>
                              <span className="text-xs text-gray-400 mt-0.5 block">
                                {done}/{bonsai.sprints.length} sprints · {bonsai.sprints.length === 0 ? "sin sprints" : `${Math.round((done/bonsai.sprints.length)*100)}% listo`}
                              </span>
                            </button>
                            <button onClick={() => toggleBonsai(bonsai.id)}
                              className="px-2 py-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs">
                              {open ? '▾' : '▸'}
                            </button>
                          </div>
                          {open && (
                            <ul className="bg-indigo-50/50 dark:bg-indigo-900/10">
                              {bonsai.sprints.map(sprint => (
                                <li key={sprint.id}>
                                  <Link href={`/board/${sprint.id}`}
                                    className="flex items-center justify-between px-5 py-2 text-xs text-gray-600 dark:text-gray-400
                                               hover:bg-indigo-100 dark:hover:bg-indigo-900/20 transition-colors">
                                    <span className="truncate flex-1">
                                      {sprint.generatedByAI && <span className="mr-1">✨</span>}
                                      {sprint.name}
                                    </span>
                                    <span className={sprint.inProgress ? "text-indigo-500" : "text-green-500"}>
                                      {sprint.progress}% · {sprint.inProgress ? "🔄" : "✅"}
                                    </span>
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}

                {historico.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-700">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/40">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">📚 Histórico</p>
                      <p className="text-xs text-gray-400 mt-0.5">{completedBonsais.length} completados</p>
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
                                {group.items.map(bonsai => (
                                  <li key={bonsai.id}>
                                    <button onClick={() => handleSelect(bonsai)}
                                      className={`w-full text-left px-5 py-2.5 text-xs transition-colors
                                        hover:bg-indigo-50 dark:hover:bg-indigo-900/20 ${
                                        selected?.id === bonsai.id
                                          ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-semibold border-l-4 border-indigo-500"
                                          : "text-gray-700 dark:text-gray-300"
                                      }`}>
                                      <span className="block truncate">🌳 {bonsai.name}</span>
                                      <span className="text-gray-400">
                                        {bonsai.sprints.length} sprint{bonsai.sprints.length !== 1 ? "s" : ""} · ✅ Completado
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
                  </div>
                )}
              </aside>

              {/* Panel central desktop */}
              <div className="flex-1 min-w-0">
                {selected ? (
                  <div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 block mb-1">Bonsai</span>
                          <h2 className="text-2xl font-bold">{selected.name}</h2>
                          {selected.description && (
                            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{selected.description}</p>
                          )}
                          {selected.generatedByAI && selected.aiPrompt && (
                            <PromptViewer prompt={selected.aiPrompt} onRegenerate={(prompt) => {
                              setAgenteInitialPrompt(prompt)
                              setAgenteInitialMode("bonsai")
                              setShowAgenteModal(true)
                            }} />
                          )}
                        </div>

                        {selected.userRole === "owner" && (
                          <button onClick={() => setDeleteTarget(selected)} title="Eliminar bonsai"
                            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded text-lg ml-4 flex-shrink-0">
                            🗑️
                          </button>
                        )}

                        {selected.userRole === "member" && selected.owner && (
                          <span className="ml-4 flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium
                                           bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                            🤝 {selected.owner.name || selected.owner.email}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500">
                        <span>🌿 {selected.sprints.length} sprint{selected.sprints.length !== 1 ? "s" : ""}</span>
                        <span>✅ {selected.sprints.filter(s => !s.inProgress).length} completados</span>
                        <span>🔄 {selected.sprints.filter(s => s.inProgress).length} en proceso</span>
                        {selected.generatedByAI && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                            ✨ Generado con IA
                          </span>
                        )}
                      </div>

                      {/* Botones de acción — solo para el dueño */}
                      {selected.userRole === "owner" && (
                        <div className="mt-4 flex gap-2 flex-wrap">
                          <button onClick={() => setShowInviteModal(true)}   // ← NUEVO
                            className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                            📨 Invitar al proyecto
                          </button>
                          <button onClick={() => setShowAgenteSprintModal(true)}
                            className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                            ✨ Generar Sprint con IA
                          </button>
                          <button onClick={() => setShowSprintModal(true)}
                            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                            + Nuevo Sprint
                          </button>
                        </div>
                      )}
                    </div>

                    {selected.sprints.length === 0 ? (
                      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                        <p className="text-gray-400 mb-4">Este bonsai aún no tiene sprints</p>
                        {selected.userRole === "owner" && (
                          <button onClick={() => setShowAgenteSprintModal(true)}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-medium">
                            ✨ Generar Sprint con IA
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {selected.sprints.map((sprint, idx) => (
                          <div key={sprint.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 flex flex-col gap-3">
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Sprint {idx + 1}</span>
                                {sprint.generatedByAI && <span className="text-xs text-purple-500 font-medium">✨ IA</span>}
                              </div>
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100 leading-snug">{sprint.name}</h3>
                              {sprint.description && (
                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{sprint.description}</p>
                              )}
                            </div>
                            <div>
                              <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>{sprint.totalCards} hoja{sprint.totalCards !== 1 ? "s" : ""}</span>
                                <span className={sprint.progress === 100 ? "text-green-500 font-medium" : "text-indigo-500 font-medium"}>
                                  {sprint.progress}% listo
                                </span>
                              </div>
                              <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full transition-all ${sprint.progress === 100 ? "bg-green-500" : "bg-indigo-500"}`}
                                  style={{ width: `${sprint.progress}%` }} />
                              </div>
                            </div>
                            <div className="flex gap-2 mt-auto">
                              <Link href={`/board/${sprint.id}`}
                                className="flex-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                                Abrir Sprint →
                              </Link>
                              {selected.userRole === "owner" && (
                                <button onClick={() => setDeleteSprintTarget(sprint)}
                                  className="px-2 py-1.5 text-gray-400 hover:text-red-500 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors text-xs">
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                    <p className="text-gray-400">Selecciona un bonsai de la lista</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <AppFooter />

      {/* Modal Crear Bonsai */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Crear Nuevo Bonsai</h2>
            <form onSubmit={handleCreateBonsai} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input type="text" required value={newName} onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Plan de Mercadeo Q3 2026" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
                <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3} placeholder="¿Cuál es el objetivo de este proyecto?" />
              </div>
              {createError && <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg"><p className="text-sm text-red-800 dark:text-red-200">{createError}</p></div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setNewName(""); setNewDescription(""); setCreateError("") }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {creating ? "Creando..." : "Crear Bonsai"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Sprint Manual */}
      {showSprintModal && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-1">Nuevo Sprint</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              En: <span className="font-medium text-indigo-500">{selected.name}</span>
            </p>
            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input type="text" required value={newSprintName} onChange={e => setNewSprintName(e.target.value)} autoFocus
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Preparación de ingredientes" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
                <textarea value={newSprintDesc} onChange={e => setNewSprintDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3} placeholder="¿Qué resultado entrega este sprint?" />
              </div>
              {createSprintError && <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg"><p className="text-sm text-red-800 dark:text-red-200">{createSprintError}</p></div>}
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowSprintModal(false); setNewSprintName(""); setNewSprintDesc(""); setCreateSprintError("") }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={creatingSprint}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                  {creatingSprint ? "Creando..." : "Crear Sprint"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Eliminar Bonsai */}
      {deleteTarget && !deleteSprintTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-2">¿Eliminar bonsai?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Estás a punto de eliminar <strong>"{deleteTarget.name}"</strong> y sus {deleteTarget.sprints.length} sprint{deleteTarget.sprints.length !== 1 ? "s" : ""}. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar Sprint */}
      {deleteSprintTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-2">¿Eliminar sprint?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Estás a punto de eliminar <strong>"{deleteSprintTarget.name}"</strong> y todas sus hojas. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteSprintTarget(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleDeleteSprint} disabled={deletingSprint}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deletingSprint ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agente IA — Bonsai */}
      {showAgenteModal && (
        <AgenteSprintModal
          onClose={() => { setShowAgenteModal(false); setAgenteInitialPrompt("") }}
          onSprintSuccess={(board: GeneratedBoard) => { setShowAgenteModal(false); setAgenteInitialPrompt(""); router.push(`/board/${board.id}`) }}
          onBonsaiSuccess={(_result: GeneratedBonsai) => { setShowAgenteModal(false); setAgenteInitialPrompt(""); fetchData() }}
          onQuotaExceeded={(type) => { setShowAgenteModal(false); setAgenteInitialPrompt(""); setQuotaType(type); setShowQuotaModal(true) }}
          initialPrompt={agenteInitialPrompt}
          initialMode="bonsai"
          context="bonsais"
        />
      )}

      {/* Modal Agente IA — Sprint para bonsai seleccionado */}
      {showAgenteSprintModal && selected && (
        <AgenteSprintModal
          onClose={() => setShowAgenteSprintModal(false)}
          onSprintSuccess={(board: GeneratedBoard) => { setShowAgenteSprintModal(false); router.push(`/board/${board.id}`) }}
          onBonsaiSuccess={(_result: GeneratedBonsai) => { setShowAgenteSprintModal(false); fetchData() }}
          onQuotaExceeded={(type) => { setShowAgenteSprintModal(false); setQuotaType(type); setShowQuotaModal(true) }}
          fixedBonsaiId={selected.id}
          fixedBonsaiName={selected.name}
          context="bonsais"
        />
      )}

      {/* Modal Encuesta de Cuota */}
      {showQuotaModal && (
        <QuotaSurveyModal type={quotaType} onClose={() => setShowQuotaModal(false)} />
      )}

      {/* Modal Invitar al Bonsai completo */}
      {showInviteModal && selected && (
        <InviteModal
          bonsaiId={selected.id}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  )
}
