"use client"
import { useState, useEffect } from "react"

type Bonsai = {
  id: string
  name: string
  description: string | null
}

export type GeneratedBoard = {
  id: string
  name: string
  description: string | null
  columns: {
    id: string
    name: string
    position: number
    cards: {
      id: string
      title: string
      description: string | null
      priority: string | null
      position: number
    }[]
  }[]
}

export type GeneratedBonsai = {
  bonsai: { id: string; name: string; description: string | null }
  boards: GeneratedBoard[]
}

interface Props {
  onClose: () => void
  onSprintSuccess: (board: GeneratedBoard) => void
  onBonsaiSuccess: (result: GeneratedBonsai) => void
}

type Mode = "sprint" | "bonsai"

export default function AgenteSprintModal({ onClose, onSprintSuccess, onBonsaiSuccess }: Props) {
  const [mode, setMode]                         = useState<Mode>("sprint")
  const [bonsais, setBonsais]                   = useState<Bonsai[]>([])
  const [loadingBonsais, setLoadingBonsais]     = useState(true)
  const [selectedBonsaiId, setSelectedBonsaiId] = useState("")
  const [creatingBonsai, setCreatingBonsai]     = useState(false)
  const [newBonsaiName, setNewBonsaiName]       = useState("")
  const [customName, setCustomName]             = useState("")
  const [freeText, setFreeText]                 = useState("")
  const [loading, setLoading]                   = useState(false)
  const [error, setError]                       = useState("")

  useEffect(() => { fetchBonsais() }, [])

  const fetchBonsais = async () => {
    try {
      const res = await fetch("/api/bonsais")
      if (res.ok) {
        const data: Bonsai[] = await res.json()
        setBonsais(data)
        if (data.length > 0) setSelectedBonsaiId(data[0].id)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingBonsais(false)
    }
  }

  const handleCreateBonsai = async () => {
    if (!newBonsaiName.trim()) return
    try {
      const res = await fetch("/api/bonsais", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBonsaiName }),
      })
      if (res.ok) {
        const bonsai: Bonsai = await res.json()
        setBonsais(prev => [...prev, bonsai])
        setSelectedBonsaiId(bonsai.id)
        setCreatingBonsai(false)
        setNewBonsaiName("")
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleGenerate = async () => {
    if (!freeText.trim()) return
    if (mode === "sprint" && !selectedBonsaiId) return
    setLoading(true)
    setError("")

    try {
      if (mode === "sprint") {
        const prompt = customName.trim()
          ? `Nombre del sprint: "${customName}"\n\n${freeText}`
          : freeText

        const res = await fetch("/api/create-sprint-from-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ freeText: prompt, bonsaiId: selectedBonsaiId }),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || "Error al generar el sprint")
          setLoading(false)
          return
        }
        const board: GeneratedBoard = await res.json()
        onSprintSuccess(board)

      } else {
        const prompt = customName.trim()
          ? `Nombre del bonsai: "${customName}"\n\n${freeText}`
          : freeText

        const res = await fetch("/api/create-bonsai-from-ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ freeText: prompt }),
        })
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || "Error al generar el bonsai")
          setLoading(false)
          return
        }
        const result: GeneratedBonsai = await res.json()
        onBonsaiSuccess(result)
      }
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
      setLoading(false)
    }
  }

  const canGenerate = freeText.trim() &&
    (mode === "bonsai" || selectedBonsaiId)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold">✨ Generar con IA</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Describe lo que quieres lograr y Claude lo estructura
            </p>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none ml-4">
            ×
          </button>
        </div>

        {/* Toggle Sprint / Bonsai */}
        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-5">
          <button
            onClick={() => { setMode("sprint"); setCustomName(""); setError("") }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === "sprint"
                ? "bg-indigo-600 text-white"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            🌿 Un Sprint
          </button>
          <button
            onClick={() => { setMode("bonsai"); setCustomName(""); setError("") }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === "bonsai"
                ? "bg-indigo-600 text-white"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            🌳 Bonsai completo
          </button>
        </div>

        {/* Descripción del modo */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 -mt-2">
          {mode === "sprint"
            ? "Genera un sprint con hojas de actividad listas para ejecutar."
            : "Genera un proyecto completo con múltiples sprints estructurados con criterio MECE."}
        </p>

        <div className="space-y-4">

          {/* Nombre personalizado */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {mode === "sprint" ? "Nombre del Sprint" : "Nombre del Bonsai"}
              <span className="text-gray-400 font-normal ml-1">(opcional)</span>
            </label>
            <input
              type="text"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder={
                mode === "sprint"
                  ? "Ej: Campaña LinkedIn Q2 2026"
                  : "Ej: Plan de Mercadeo Compita 2026"
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                         dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {/* Selector de Bonsai — solo en modo Sprint */}
          {mode === "sprint" && (
            <div>
              <label className="block text-sm font-medium mb-1">Proyecto (Bonsai) *</label>
              {loadingBonsais ? (
                <p className="text-sm text-gray-400">Cargando proyectos...</p>
              ) : !creatingBonsai ? (
                <select
                  value={selectedBonsaiId}
                  onChange={e => {
                    if (e.target.value === "__nuevo__") {
                      setCreatingBonsai(true)
                      setSelectedBonsaiId("")
                    } else {
                      setSelectedBonsaiId(e.target.value)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                             dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  {bonsais.length === 0 && (
                    <option value="" disabled>Sin proyectos — crea uno abajo</option>
                  )}
                  {bonsais.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                  <option value="__nuevo__">+ Crear nuevo Bonsai</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={newBonsaiName}
                    onChange={e => setNewBonsaiName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleCreateBonsai()}
                    placeholder="Nombre del nuevo Bonsai"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                               dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <button onClick={handleCreateBonsai} disabled={!newBonsaiName.trim()}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
                               disabled:opacity-50 text-sm font-medium transition-colors">
                    Crear
                  </button>
                  <button onClick={() => { setCreatingBonsai(false); setNewBonsaiName("") }}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors">
                    ×
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Brief */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {mode === "sprint"
                ? "¿Qué quieres lograr con este sprint? *"
                : "¿Qué proyecto quieres estructurar? *"}
            </label>
            <textarea
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              placeholder={
                mode === "sprint"
                  ? "Ej: Lanzar una campaña de posts en LinkedIn para promocionar Compita entre directores de compras de empresas dominicanas. Objetivo: 5 leads calificados en 30 días."
                  : "Ej: Ejecutar el primer Plan de Mercadeo de Compita para el mercado dominicano. Incluye rediseño de landing, campaña LinkedIn, y alianzas con asociaciones empresariales."
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                         dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500
                         text-sm resize-none"
              rows={5}
            />
            <p className="text-xs text-gray-400 mt-1">
              Cuanto más detalle des, mejor será el resultado generado.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                         hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !canGenerate}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
                         disabled:opacity-50 transition-colors text-sm font-medium
                         flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="animate-spin inline-block">⟳</span> Generando...</>
              ) : mode === "sprint" ? (
                "✨ Generar Sprint"
              ) : (
                "🌳 Generar Bonsai"
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
