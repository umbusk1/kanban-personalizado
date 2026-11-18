"use client"
// Botón «Enlace para YouRadar»: muestra el enlace privado del calendario del bonsai,
// para pegarlo una sola vez en YouRadar (o Google/Apple) y que se actualice solo.
import { useState } from "react"

export default function EnlaceCalendario({ bonsaiId, compacto = false }: { bonsaiId: string; compacto?: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const [url, setUrl] = useState("")
  const [estado, setEstado] = useState<"" | "cargando" | "copiado" | "error" | "cambiado">("")

  const pedir = async (cambiar: boolean) => {
    setEstado("cargando")
    try {
      const r = await fetch(`/api/bonsais/${bonsaiId}/enlace-calendario`, { method: cambiar ? "POST" : "GET", cache: "no-store" })
      const d = await r.json()
      if (!r.ok || !d.url) throw new Error(d.error || "error")
      setUrl(d.url)
      setEstado(cambiar ? "cambiado" : "")
    } catch {
      setEstado("error")
    }
  }

  const abrir = () => {
    const nuevo = !abierto
    setAbierto(nuevo)
    if (nuevo && !url) pedir(false)
  }

  const copiar = async () => {
    try { await navigator.clipboard.writeText(url); setEstado("copiado") } catch { setEstado("error") }
  }

  const cambiar = () => {
    if (!confirm("¿Cambiar el enlace? El anterior dejará de funcionar y tendrás que pegar el nuevo en YouRadar.")) return
    pedir(true)
  }

  const boton = compacto
    ? "block w-full text-center bg-cyan-700 hover:bg-cyan-800 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
    : "px-3 py-1.5 text-xs bg-cyan-700 text-white rounded-lg hover:bg-cyan-800 transition-colors font-medium"

  return (
    <div className={compacto ? "w-full" : ""}>
      <button type="button" onClick={abrir} className={boton}
        title="Un enlace privado para suscribirte al calendario de este bonsai desde YouRadar: se actualiza solo">
        🔗 Enlace para YouRadar
      </button>
      {abierto && (
        <div className="mt-2 p-3 rounded-lg border border-cyan-200 dark:border-cyan-900 bg-cyan-50 dark:bg-cyan-950/40 text-xs text-gray-700 dark:text-gray-300 space-y-2 max-w-xl">
          <p>Pega este enlace en YouRadar (extensión de Chrome → Opciones → agregar calendario). Lo relee solo, cada 30 minutos. Solo verás los sprints a los que tienes acceso.</p>
          {estado === "cargando" && <p className="text-gray-500">Preparando el enlace…</p>}
          {estado === "error" && <p className="text-red-600">No pude preparar el enlace. Inténtalo de nuevo.</p>}
          {url && (
            <>
              <input readOnly value={url} onFocus={(e) => e.currentTarget.select()}
                className="w-full font-mono text-[11px] px-2 py-1.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" />
              <div className="flex flex-wrap gap-2 items-center">
                <button type="button" onClick={copiar}
                  className="px-3 py-1.5 bg-cyan-700 text-white rounded-lg hover:bg-cyan-800 font-medium">
                  {estado === "copiado" ? "✓ Copiado" : "Copiar enlace"}
                </button>
                <button type="button" onClick={cambiar}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-white dark:hover:bg-gray-800">
                  Cambiar enlace
                </button>
                {estado === "cambiado" && <span className="text-green-700 dark:text-green-400">Enlace nuevo listo; el anterior ya no sirve.</span>}
              </div>
              <p className="text-gray-500">Es privado, como una contraseña: quien lo tenga puede ver las hojas. Si se filtra, usa «Cambiar enlace».</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
