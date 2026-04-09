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

interface Props {
  onClose: () => void
  onSuccess: (board: GeneratedBoard) => void
}

type Mode = "sprint" | "bonsai"

export default function AgenteSprintModal({ onClose, onSuccess }: Props) {
  const [mode, setMode]                         = useState<Mode>("sprint")
  const [bonsais, setBonsais]                   = useState<Bonsai[]>([])
  const [loadingBonsais, setLoadingBonsais]     = useState(true)
  const [selectedBonsaiId, setSelectedBonsaiId] = useState("")
  const [creatingBonsai, setCreatingBonsai]     = useState(false)
  const [newBonsaiName, setNewBonsaiName]       = useState("")
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
    if (!freeText.trim() || !selectedBonsaiId) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/create-sprint-from-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ freeText, bonsaiId: selectedBonsaiId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Error al generar el sprint")
        setLoading(false)
        return
      }
      const board: GeneratedBoard = await res.json()
      onSuccess(board)
    } catch {
      setError("Error de conexión. Intenta de nuevo.")
      setLoading(false)
    }
  }

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
            onClick={() => setMode("sprint")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === "sprint"
                ? "bg-indigo-600 text-white"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            🌿 Un Sprint
          </button>
          <button
            onClick={() => setMode("bonsai")}
            className={`flex-1 py-2 text-sm font-medium transition-colors relative ${
              mode === "bonsai"
                ? "bg-indigo-600 text-white"
                : "text-gray-400 dark:text-gray-500 cursor-not-allowed"
            }`}
            disabled
            title="Próximamente"
          >
            🌳 Bonsai completo
            <span className="ml-2 text-xs bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300 px-1.5 py-0.5 rounded-full">
              Próximo
            </span>
          </button>
        </div>

        <div className="space-y-4">

          {/* Selector de Bonsai */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Proyecto (Bonsai) *
            </label>
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

          {/* Brief */}
          <div>
            <label className="block text-sm font-medium mb-1">
              ¿Qué quieres lograr con este sprint? *
            </label>
            <textarea
              value={freeText}
              onChange={e => setFreeText(e.target.value)}
              placeholder="Ej: Lanzar una campaña de posts en LinkedIn para promocionar Compita entre directores de compras de empresas dominicanas. El objetivo es generar al menos 5 leads calificados en 30 días."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                         dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500
                         text-sm resize-none"
              rows={5}
            />
            <p className="text-xs text-gray-400 mt-1">
              Cuanto más detalle des, mejor será el sprint generado.
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
              disabled={loading || !freeText.trim() || !selectedBonsaiId}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
                         disabled:opacity-50 transition-colors text-sm font-medium
                         flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="animate-spin inline-block">⟳</span> Generando...</>
              ) : (
                "✨ Generar Sprint"
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
