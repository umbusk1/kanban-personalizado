"use client"
import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"

type DecodedToken = {
  empresaId: number   // camelCase en el JWT de Compita
  email:     string
  userId?:   number
  rol?:      string
  plan?:     string
}

type Stage =
  | "loading"        // leyendo params y sesión
  | "ready-login"    // no hay sesión → mostrar confirmación de identidad
  | "ready-generate" // hay sesión válida → mostrar botón de generar
  | "generating"     // llamando a la API
  | "error"          // algo salió mal

export default function DesdeCompitaPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const { data: session, status } = useSession()

  const [stage,    setStage]    = useState<Stage>("loading")
  const [decoded,  setDecoded]  = useState<DecodedToken | null>(null)
  const [prompt,   setPrompt]   = useState("")
  const [token,    setToken]    = useState("")
  const [errorMsg, setErrorMsg] = useState("")

  // ── 1. Leer y validar parámetros de la URL ───────────────────────────────
  useEffect(() => {
    const rawToken  = searchParams.get("token")  ?? ""
    const rawPrompt = searchParams.get("prompt") ?? ""

    if (!rawToken || !rawPrompt) {
      setErrorMsg("Enlace inválido. Vuelve a Compita y usa el botón 'Ir a KanbanBonsai'.")
      setStage("error")
      return
    }

    try {
      // JWT → extraer payload (parte del medio), convertir base64url → base64
      const parts   = rawToken.split('.')
      const segment = parts.length === 3 ? parts[1] : rawToken
      const base64  = segment.replace(/-/g, '+').replace(/_/g, '/')
      const padded  = base64 + '='.repeat((4 - base64.length % 4) % 4)
      const dec     = JSON.parse(atob(padded)) as DecodedToken   // atob: nativo del browser
      if (!dec.email || !dec.empresaId) throw new Error("Incompleto")
      setDecoded(dec)
      setToken(rawToken)
      setPrompt(rawPrompt)    } catch {
      setErrorMsg("Token de Compita inválido. Vuelve a Compita e intenta de nuevo.")
      setStage("error")
    }
  }, [searchParams])

  // ── 2. Una vez que tenemos el token y la sesión, decidir el estado ────────
  useEffect(() => {
    if (!decoded || stage === "error") return
    if (status === "loading") return

    const esElMismoUsuario =
      status === "authenticated" &&
      (session?.user as any)?.empresaId === decoded.empresaId

    setStage(esElMismoUsuario ? "ready-generate" : "ready-login")
  }, [decoded, status, session])

  // ── 3. Acción principal: login + generar bonsai ───────────────────────────
  const handleGenerar = async () => {
    if (!token || !prompt || !decoded) return
    setStage("generating")

    try {
      // Login con Compita si aún no hay sesión válida
      const necesitaLogin =
        status !== "authenticated" ||
        (session?.user as any)?.empresaId !== decoded.empresaId

      if (necesitaLogin) {
        const result = await signIn("compita", {
          compitaToken: token,
          redirect:     false,
        })
        if (result?.error) {
          setErrorMsg("No se pudo autenticar con Compita: " + result.error)
          setStage("error")
          return
        }
      }

      // Generar el bonsai (fromCompita: true → descuenta cupo de Compita)
      const res = await fetch("/api/create-bonsai-from-ai", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ freeText: prompt, fromCompita: true }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (res.status === 403) {
          setErrorMsg("Tu empresa no tiene cupo disponible este mes. Contacta al administrador de Compita.")
        } else if (res.status === 429) {
          setErrorMsg("Cupo mensual de Compita agotado.")
        } else {
          setErrorMsg(data.error || "Error al generar el bonsai.")
        }
        setStage("error")
        return
      }

      const result = await res.json()
      // Redirigir a Mis Bonsais con el bonsai recién creado resaltado
      router.push(`/bonsais?id=${result.bonsai.id}`)

    } catch {
      setErrorMsg("Error de conexión. Intenta de nuevo.")
      setStage("error")
    }
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  if (stage === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🌳</div>
          <p className="text-gray-500">Preparando tu espacio en KanbanBonsai…</p>
        </div>
      </div>
    )
  }

  if (stage === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <p className="text-4xl mb-4">⚠️</p>
          <h2 className="text-lg font-semibold mb-2">Algo salió mal</h2>
          <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
          <a href="https://compita.umbusk.com"
            className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors">
            ← Volver a Compita
          </a>
        </div>
      </div>
    )
  }

  if (stage === "generating") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin inline-block">⟳</div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Generando tu bonsai…</p>
          <p className="text-gray-400 text-sm mt-2">Claude está estructurando tu proyecto</p>
        </div>
      </div>
    )
  }

  // ── Estados ready-login y ready-generate comparten la misma pantalla ──────
  const promptPreview = prompt.length > 300
    ? prompt.slice(0, 300) + "…"
    : prompt

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-8">

        {/* Header */}
        <div className="text-center mb-6">
          <p className="text-3xl mb-3">🌳</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Generar Bonsai desde Compita
          </h1>
          {decoded && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Cuenta: <span className="font-medium text-indigo-500">{decoded.email}</span>
            </p>
          )}
        </div>

        {/* Vista previa del prompt */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500 mb-2">
            📋 Proyecto a estructurar
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {promptPreview}
          </p>
        </div>

        {/* Mensaje de estado según stage */}
        {stage === "ready-login" && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 mb-5 text-sm text-amber-700 dark:text-amber-300">
            Debes confirmar tu identidad de Compita para continuar.
          </div>
        )}

        {stage === "ready-generate" && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-5 text-sm text-green-700 dark:text-green-300">
            ✅ Sesión activa como <strong>{decoded?.email}</strong>. Listo para generar.
          </div>
        )}

        {/* Botón principal */}
        <button
          onClick={handleGenerar}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg
                     font-semibold text-sm transition-colors flex items-center justify-center gap-2">
          ✨ {stage === "ready-login" ? "Entrar y Generar Bonsai con IA" : "Generar Bonsai con IA"}
        </button>

        <p className="text-xs text-center text-gray-400 mt-4">
          Descuenta 1 uso del cupo mensual de tu plan Compita Enterprise
        </p>

      </div>
    </div>
  )
}
