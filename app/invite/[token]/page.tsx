'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const sessionData = useSession()
  const session = sessionData?.data
  const status = sessionData?.status ?? 'loading'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAccept = async () => {
    if (!session) {
      router.push(`/login?callbackUrl=/invite/${params.token}`)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/invitations/${params.token}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al aceptar la invitación')
        return
      }
      router.refresh()
      router.push(`/board/${data.boardId}`)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Pantalla de carga ── */
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
        <p className="text-white/40 tracking-widest text-sm uppercase animate-pulse">
          Cargando…
        </p>
      </div>
    )
  }

  /* ── Layout principal ── */
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#0d1117]">

      {/* ── Fondo SVG japonés ── */}
      <svg
        className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="bamboo" x="0" y="0" width="60" height="120" patternUnits="userSpaceOnUse">
            <rect x="26" y="0" width="8" height="120" fill="#4a7c59" rx="2" />
            <rect x="24" y="30" width="12" height="3" fill="#3a6045" rx="1" />
            <rect x="24" y="60" width="12" height="3" fill="#3a6045" rx="1" />
            <rect x="24" y="90" width="12" height="3" fill="#3a6045" rx="1" />
            <ellipse cx="44" cy="22" rx="14" ry="5" fill="#4a7c59" transform="rotate(-30 44 22)" />
            <ellipse cx="16" cy="52" rx="14" ry="5" fill="#4a7c59" transform="rotate(30 16 52)" />
            <ellipse cx="44" cy="82" rx="14" ry="5" fill="#4a7c59" transform="rotate(-30 44 82)" />
          </pattern>
          <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="1" fill="#ffffff" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bamboo)" />
        <rect width="100%" height="100%" fill="url(#dots)" />
        <circle cx="85%" cy="12%" r="60" fill="none" stroke="#c9a96e" strokeWidth="1.5" opacity="0.4" />
        <circle cx="85%" cy="12%" r="55" fill="#c9a96e" opacity="0.06" />
      </svg>

      {/* Gradiente de profundidad */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d1117] via-transparent to-[#0d1117]/80 pointer-events-none" />

      {/* ── Header público con logo ── */}
      <header className="relative z-10 flex justify-center pt-8 pb-4">
        <Link href="/">
          <Image
            src="/logo.png"
            width={240}
            height={90}
            alt="KanbanBonsai"
            className="h-20 w-auto drop-shadow-lg"
            priority
          />
        </Link>
      </header>

      {/* ── Contenido central ── */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">

          {/* Tarjeta glassmorphism */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl px-8 py-10 text-center">

            <div className="text-5xl mb-4">📋</div>
            <h1 className="text-2xl font-bold text-white mb-2 tracking-wide">
              Invitación a tablero
            </h1>

            {session ? (
              /* ── Usuario con sesión activa ── */
              <>
                <p className="text-white/60 text-sm mb-8 leading-relaxed">
                  Hola,{' '}
                  <strong className="text-white">
                    {session.user?.name || session.user?.email}
                  </strong>
                  . Haz clic para unirte al tablero.
                </p>

                {/* Advertencia si el email no coincide */}
                {session.user?.email && (
                  <div className="rounded-lg bg-yellow-500/20 border border-yellow-400/30 px-4 py-3 mb-4 text-sm text-yellow-200">
                    ⚠️ Asegúrate de estar logueado con el correo al que llegó la invitación.
                    Actualmente logueado como <strong>{session.user.email}</strong>.
                  </div>
                )}

                {error && (
                  <div className="rounded-lg bg-red-500/20 border border-red-400/30 px-4 py-3 mb-6">
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleAccept}
                  disabled={loading}
                  className="w-full py-3 px-6 rounded-lg font-semibold text-sm
                             bg-[#c9a96e] hover:bg-[#e0c080] text-[#0d1117]
                             transition-all duration-200 shadow-lg
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Procesando…' : '✅ Aceptar invitación'}
                </button>
              </>
            ) : (
              /* ── Usuario sin sesión ── */
              <>
                <p className="text-white/60 text-sm mb-8 leading-relaxed">
                  Para aceptar la invitación necesitas una cuenta.
                  Si ya tienes una, inicia sesión. Si no, regístrate gratis.
                </p>

                {error && (
                  <div className="rounded-lg bg-red-500/20 border border-red-400/30 px-4 py-3 mb-6">
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <Link
                    href={`/login?callbackUrl=/invite/${params.token}`}
                    className="w-full py-3 px-6 rounded-lg font-semibold text-sm
                               bg-[#c9a96e] hover:bg-[#e0c080] text-[#0d1117]
                               transition-all duration-200 shadow-lg text-center"
                  >
                    🔐 Iniciar sesión
                  </Link>
                  <Link
                    href={`/register?callbackUrl=/invite/${params.token}`}
                    className="w-full py-3 px-6 rounded-lg font-semibold text-sm
                               bg-transparent border border-[#c9a96e]/60 text-[#c9a96e]
                               hover:bg-[#c9a96e]/10 transition-all duration-200 text-center"
                  >
                    ✨ Crear cuenta nueva
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Firma discreta */}
          <p className="text-center text-white/25 text-xs mt-6 tracking-widest uppercase">
            KanbanBonsai · Umbusk LLC
          </p>
        </div>
      </main>
    </div>
  )
}
