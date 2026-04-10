"use client"
import { useState } from "react"

interface Props {
  type: "sprint" | "bonsai"
  onClose: () => void
}

const BONSAI_OPTIONS = [2, 4, 6, 8]
const SPRINT_OPTIONS = [6, 9, 12, 15]

export default function QuotaSurveyModal({ type, onClose }: Props) {
  const [answered, setAnswered]         = useState(false)
  const [wantsMore, setWantsMore]       = useState<boolean | null>(null)
  const [bonsaiChoice, setBonsaiChoice] = useState<number | null>(null)
  const [sprintChoice, setSprintChoice] = useState<number | null>(null)
  const [submitted, setSubmitted]       = useState(false)

  const handleNo = () => {
    setWantsMore(false)
    setAnswered(true)
  }

  const handleYes = () => {
    setWantsMore(true)
    setAnswered(true)
  }

  const handleSubmit = async () => {
    // Guardar respuesta para análisis futuro
    try {
      await fetch("/api/usage-survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wantsMore: true,
          bonsaisPerWeek: bonsaiChoice,
          sprintsPerWeek: sprintChoice,
        }),
      })
    } catch (e) {
      console.error(e)
    }
    setSubmitted(true)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl">

        {!submitted ? (
          <>
            {/* Mensaje de cupo agotado */}
            <div className="text-center mb-6">
              <p className="text-3xl mb-3">✨</p>
              <h2 className="text-lg font-bold mb-2">
                {type === "sprint"
                  ? "Alcanzaste tu límite semanal de sprints con IA"
                  : "Alcanzaste tu límite semanal de bonsais con IA"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                El plan gratuito incluye{" "}
                {type === "sprint" ? "3 sprints" : "1 bonsai"} generados con IA por semana.
                El cupo se renueva cada lunes.
              </p>
            </div>

            {!answered ? (
              <>
                <p className="text-sm font-medium text-center mb-4">
                  ¿Quieres semanalmente seguir generando con IA más bonsais y sprints?
                </p>
                <div className="flex gap-3">
                  <button onClick={handleNo}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium">
                    No
                  </button>
                  <button onClick={handleYes}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
                               transition-colors text-sm font-medium">
                    Sí
                  </button>
                </div>
              </>
            ) : wantsMore === false ? (
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Perfecto. Tu cupo se renueva el próximo lunes. 🌿
                </p>
                <button onClick={onClose}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors">
                  Entendido
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 text-center">
                  Ayúdanos a definir los planes. ¿Cuántos necesitarías por semana?
                </p>

                {/* Bonsais */}
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">🌳 Bonsais por semana</p>
                  <div className="flex gap-2">
                    {BONSAI_OPTIONS.map(n => (
                      <button key={n} onClick={() => setBonsaiChoice(n)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          bonsaiChoice === n
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-400"
                        }`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sprints */}
                <div className="mb-6">
                  <p className="text-sm font-medium mb-2">🌿 Sprints por semana</p>
                  <div className="flex gap-2">
                    {SPRINT_OPTIONS.map(n => (
                      <button key={n} onClick={() => setSprintChoice(n)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          sprintChoice === n
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-400"
                        }`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={onClose}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                               hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!bonsaiChoice || !sprintChoice}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700
                               disabled:opacity-50 transition-colors text-sm font-medium">
                    Enviar
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-3xl mb-3">🙏</p>
            <h2 className="text-lg font-bold mb-2">¡Gracias por tu respuesta!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Tomaremos en cuenta tus preferencias para definir los próximos planes.
            </p>
            <button onClick={onClose}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors">
              Cerrar
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
