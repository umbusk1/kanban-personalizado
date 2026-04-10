"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import AppHeader from "@/components/AppHeader"
import AppFooter from "@/components/AppFooter"
import AgenteSprintModal, { GeneratedBoard, GeneratedBonsai } from "@/components/AgenteSprintModal"
import QuotaSurveyModal from "@/components/QuotaSurveyModal"

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
  id: string
  name: string
  description: string | null
  createdAt: string
  sprints: Sprint[]
  generatedByAI: boolean
  aiPrompt: string | null
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

function PromptViewer({ prompt, onReuse }: { prompt: string; onReuse: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-3 border border-purple-200 dark:border-purple-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium
                   text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
        <span>✨ Ver prompt original</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 bg-purple-50 dark:bg-purple-900/10">
          <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
            {prompt}
          </p>
          <button
            onClick={onReuse}
            className="mt-2 text-xs text-purple-600 dark:text-purple-400 hover:underline font-medium">
            Usar de nuevo →
          </button>
        </div>
      )}
    </div>
  )
}

export default function BonsaisPage() {
  const router = useRouter()
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

  const [showAgenteModal, setShowAgenteModal] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Bonsai | null>(null)
  const [deleting, setDeleting]         = useState(false)

  const [showQuotaModal, setShowQuotaModal] = useState(false)
  const [quotaType, setQuotaType]           = useState<"sprint" | "bonsai">("bonsai")

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    try {
      const res = await fetch("/api/bonsais")
      if (res.ok) {
        const data: Bonsai[] = await res.json()
        setBonsais(data)
        setSelected(prev => {
          const stillExists = data.find(b => b.id === prev?.id)
          const inProgress  = data.filter(b => !isCompleted(b))
          return stillExists ?? (inProgress.length > 0 ? inProgress[0] : data[0] ?? null)
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const toggleBonsai = (id: string) => {
    setOpenBonsais(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleMonth = (key: string) => {
    setOpenMonths(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
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
    e.preventDefault()
    setCreateError("")
    setCreating(true)
    try {
      const res = await fetch("/api/bonsais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDescription }),
      })
      if (!res.ok) {
        const data = await res.json()
        setCreateError(data.error || "Error al crear bonsai")
        setCreating(false)
        return
      }
      setShowModal(false)
      setNewName("")
      setNewDescription("")
      setCreating(false)
      await fetchData()
    } catch {
      setCreateError("Error al crear bonsai")
      setCreating(false)
    }
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
    } catch {
      console.error("Error al eliminar bonsai")
    } finally {
      setDeleting(false)
    }
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

      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">

        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold mb-1">Mis Bonsais</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {bonsais.length} proyecto{bonsais.length !== 1 ? "s" : ""}
              {totalSprints > 0 && (
                <span className="ml-2 text-indigo-500 font-medium">
                  · {totalSprints} sprint{totalSprints !== 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAgenteModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm">
              ✨ Generar con IA
            </button>
            <button onClick={() => setShowModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm">
              + Nuevo Bonsai
            </button>
          </div>
        </div>

        {bonsais.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <p className="text-4xl mb-4">🌳</p>
            <p className="text-gray-500 mb-2 text-lg font-medium">Aún no tienes proyectos</p>
            <p className="text-gray-400 text-sm mb-6">
              Un Bonsai es un proyecto mayor compuesto por múltiples sprints.
            </p>
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
          <div className="flex gap-5 items-start">

            {/* ── Columna izquierda: acordeón ── */}
            <aside className="flex-shrink-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden self-start">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-indigo-50 dark:bg-indigo-900/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  🌳 En proceso
                </p>
                <p className="text-xs text-indigo-400 mt-0.5">{inProgressBonsais.length} activos</p>
              </div>

              {inProgressBonsais.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 px-4">
                  Todos los bonsais están completados
                </p>
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
                          <button
                            onClick={() => handleSelect(bonsai)}
                            className={`flex-1 text-left px-3 py-3 text-sm transition-colors
                              hover:bg-indigo-50 dark:hover:bg-indigo-900/20 ${
                              selected?.id === bonsai.id
                                ? "text-indigo-700 dark:text-indigo-300 font-semibold"
                                : "text-gray-700 dark:text-gray-300"
                            }`}>
                            <span className="block truncate">
                              {bonsai.generatedByAI && (
                                <span className="mr-1 text-xs" title="Generado con IA">✨</span>
                              )}
                              {bonsai.name}
                            </span>
                            <span className="text-xs text-gray-400 font-normal mt-0.5 block">
                              {bonsai.sprints.length} sprint{bonsai.sprints.length !== 1 ? "s" : ""}
                              {bonsai.sprints.length > 0 && (
                                <span className="ml-1 text-green-500">· {done} listo{done !== 1 ? "s" : ""}</span>
                              )}
                            </span>
                          </button>
                          <button
                            onClick={() => toggleBonsai(bonsai.id)}
                            className="px-3 py-3 text-gray-400 hover:text-indigo-500 transition-colors text-xs">
                            {open ? '▾' : '▸'}
                          </button>
                        </div>

                        {open && bonsai.sprints.length > 0 && (
                          <ul className="bg-gray-50 dark:bg-gray-700/20 border-t border-gray-100 dark:border-gray-700">
                            {bonsai.sprints.map((sprint, idx) => (
                              <li key={sprint.id}
                                className="flex items-center justify-between px-4 py-2 gap-2
                                           hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                                <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
                                  <span className="text-gray-400 mr-1">{idx + 1}.</span>
                                  {sprint.generatedByAI && (
                                    <span className="mr-1 text-xs" title="Generado con IA">✨</span>
                                  )}
                                  {sprint.name}
                                </span>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className="text-xs text-indigo-500 font-medium whitespace-nowrap">
                                    {sprint.progress}%
                                  </span>
                                  <Link href={`/board/${sprint.id}`}
                                    className="px-1.5 py-0.5 text-xs bg-indigo-600 text-white rounded
                                               hover:bg-indigo-700 transition-colors font-medium">
                                    Abrir
                                  </Link>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </aside>

            {/* ── Panel central ── */}
            <div className="flex-1 min-w-0">
              {selected && (
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
                          <PromptViewer
                            prompt={selected.aiPrompt}
                            onReuse={() => setShowAgenteModal(true)}
                          />
                        )}
                      </div>
                      <button onClick={() => setDeleteTarget(selected)} title="Eliminar bonsai"
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded text-lg ml-4 flex-shrink-0">🗑️</button>
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
                  </div>

                  {selected.sprints.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                      <p className="text-gray-400 mb-4">Este bonsai aún no tiene sprints</p>
                      <button onClick={() => setShowAgenteModal(true)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-medium">
                        ✨ Generar Sprint con IA
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selected.sprints.map((sprint, idx) => (
                        <div key={sprint.id}
                          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 flex flex-col gap-3">
                          <div>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                                Sprint {idx + 1}
                              </span>
                              {sprint.generatedByAI && (
                                <span className="text-xs text-purple-500 font-medium">✨ IA</span>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                              {sprint.name}
                            </h3>
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
                              <div
                                className={`h-1.5 rounded-full transition-all ${
                                  sprint.progress === 100 ? "bg-green-500" : "bg-indigo-500"
                                }`}
                                style={{ width: `${sprint.progress}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-auto">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              sprint.inProgress
                                ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
                                : "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                            }`}>
                              {sprint.inProgress ? "🔄 En proceso" : "✅ Completado"}
                            </span>
                            <Link href={`/board/${sprint.id}`}
                              className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                              Abrir →
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Columna derecha: Histórico ── */}
            <aside className="flex-shrink-0 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden self-start">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  📚 Histórico
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{completedBonsais.length} completados</p>
              </div>
              {completedBonsais.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 px-4">
                  Aún no hay bonsais completados
                </p>
              ) : (
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
                                  className={`w-full text-left px-5 py-2.5 text-sm transition-colors
                                    hover:bg-indigo-50 dark:hover:bg-indigo-900/20 ${
                                    selected?.id === bonsai.id
                                      ? "text-indigo-600 dark:text-indigo-400 font-semibold border-l-4 border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
                                      : "text-gray-600 dark:text-gray-400"
                                  }`}>
                                  <span className="block truncate">
                                    {bonsai.generatedByAI && (
                                      <span className="mr-1 text-xs" title="Generado con IA">✨</span>
                                    )}
                                    {bonsai.name}
                                  </span>
                                  <span className="text-xs text-gray-400 font-normal mt-0.5 block">
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
              )}
            </aside>

          </div>
        )}
      </main>

      <AppFooter />

      {/* Modal Crear Bonsai Manual */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Nuevo Bonsai</h2>
            <form onSubmit={handleCreateBonsai} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre *</label>
                <input type="text" required value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Plan de Mercadeo Compita 2026" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripción (opcional)</label>
                <textarea value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3} placeholder="¿Cuál es el objetivo estratégico de este proyecto?" />
              </div>
              {createError && (
                <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{createError}</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button"
                  onClick={() => { setShowModal(false); setNewName(""); setNewDescription(""); setCreateError("") }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                             hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
                             disabled:opacity-50 transition-colors">
                  {creating ? "Creando..." : "Crear Bonsai"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-2">¿Eliminar bonsai?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Estás a punto de eliminar <strong>"{deleteTarget.name}"</strong> y sus {deleteTarget.sprints.length} sprint{deleteTarget.sprints.length !== 1 ? "s" : ""}. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700
                           disabled:opacity-50 transition-colors">
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agente IA */}
      {showAgenteModal && (
        <AgenteSprintModal
          onClose={() => setShowAgenteModal(false)}
          onSprintSuccess={(board: GeneratedBoard) => {
            setShowAgenteModal(false)
            router.push(`/board/${board.id}`)
          }}
          onBonsaiSuccess={(_result: GeneratedBonsai) => {
            setShowAgenteModal(false)
            fetchData()
          }}
          onQuotaExceeded={(type) => {
            setShowAgenteModal(false)
            setQuotaType(type)
            setShowQuotaModal(true)
          }}
        />
      )}

      {/* Modal Encuesta de Cuota */}
      {showQuotaModal && (
        <QuotaSurveyModal
          type={quotaType}
          onClose={() => setShowQuotaModal(false)}
        />
      )}
    </div>
  )
}
