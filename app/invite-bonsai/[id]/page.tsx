'use client'

import { useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export default function InviteBonsaiPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const tokens = searchParams.get('tokens')?.split(',') ?? []
  const emailParam = searchParams.get('email') ?? ''

  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [accepted, setAccepted] = useState(false)
  const [bonsaiName, setBonsaiName] = useState('')

  // Aceptar todas las invitaciones en secuencia
  const handleAccept = async () => {
    if (!session?.user) return
    setLoading(true)
    setError('')

    let anyError = false
    for (const token of tokens) {
      try {
        const res = await fetch(`/api/invitations/${token}`, { method: 'POST' })
        if (!res.ok) {
          const data = await res.json()
          // "ya es miembro" no es un error real — lo ignoramos
          if (!data.error?.includes('ya es miembro') && !data.error?.includes('aceptada')) {
            anyError = true
            setError(data.error || 'Error al aceptar una de las invitaciones')
          }
        }
      } catch {
        anyError = true
        setError('Error de conexión al aceptar la invitación')
      }
    }

    setLoading(false)
    if (!anyError) setAccepted(true)
  }

  // Si ya está logueado con el email correcto, mostrar botón de aceptar
  const emailMatch = session?.user?.email?.toLowerCase() === emailParam.toLowerCase()

  const handleSwitchAccount = async () => {
    await signIn(undefined, { callbackUrl: window.location.href })
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117]">
        <p className="text-white/50">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      {/* Header */}
      <header className="flex justify-center pt-8 pb-4">
        <Link href="/">
          <Image src="/logo.svg" width={220} height={80} alt="KanbanBonsai" className="h-14 w-auto" priority />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl px-8 py-10 text-center">

          {accepted ? (
            <>
              <div className="text-5xl mb-4">🌳</div>
              <h1 className="text-2xl font-bold text-white mb-2">¡Ya eres parte del proyecto!</h1>
              <p className="text-white/60 text-sm mb-8">
                Ahora tienes acceso a todos los sprints del proyecto. Encuéntralos en <strong className="text-white">Mis Bonsais</strong> y en <strong className="text-white">Mis Sprints</strong>.
              </p>
              <button
                onClick={() => router.push('/bonsais')}
                className="w-full py-3 px-6 rounded-lg font-semibold text-sm
                           bg-[#c9a96e] hover:bg-[#e0c080] text-[#0d1117]
                           transition-all duration-200 shadow-lg">
                Ir a Mis Bonsais →
              </button>
            </>
          ) : (
            <>
              <div className="text-5xl mb-4">📋</div>
              <h1 className="text-2xl font-bold text-white mb-2">Invitación a proyecto</h1>

              {session ? (
                <>
                  <p className="text-white/60 text-sm mb-4 leading-relaxed">
                    Haz clic para unirte al proyecto completo y todos sus sprints.
                  </p>

                  {/* Advertencia si el email no coincide */}
                  {!emailMatch && (
                    <div className="rounded-lg bg-yellow-500/20 border border-yellow-400/30 px-4 py-3 mb-4 text-sm text-yellow-200">
                      ⚠️ Esta invitación fue enviada a <strong>{emailParam}</strong> pero estás logueado como <strong>{session.user?.email}</strong>.
                      <button onClick={handleSwitchAccount}
                        className="mt-2 w-full py-2 px-4 rounded-lg font-semibold text-sm
                                   bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all">
                        🔄 Cambiar de cuenta
                      </button>
                    </div>
                  )}

                  {error && (
                    <div className="rounded-lg bg-red-500/20 border border-red-400/30 px-4 py-3 mb-4">
                      <p className="text-sm text-red-300">{error}</p>
                    </div>
                  )}

                  {emailMatch && (
                    <button onClick={handleAccept} disabled={loading}
                      className="w-full py-3 px-6 rounded-lg font-semibold text-sm
                                 bg-[#c9a96e] hover:bg-[#e0c080] text-[#0d1117]
                                 transition-all duration-200 shadow-lg
                                 disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? 'Procesando…' : '✅ Aceptar invitación al proyecto'}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-white/60 text-sm mb-8 leading-relaxed">
                    Para aceptar la invitación necesitas una cuenta. Si ya tienes una, inicia sesión. Si no, regístrate gratis.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Link href={`/login?callbackUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                      className="w-full py-3 px-6 rounded-lg font-semibold text-sm
                                 bg-[#c9a96e] hover:bg-[#e0c080] text-[#0d1117]
                                 transition-all duration-200 shadow-lg text-center">
                      🔐 Iniciar sesión
                    </Link>
                    <Link href={`/register?callbackUrl=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                      className="w-full py-3 px-6 rounded-lg font-semibold text-sm
                                 bg-transparent border border-[#c9a96e]/60 text-[#c9a96e]
                                 hover:bg-[#c9a96e]/10 transition-all duration-200 text-center">
                      ✨ Crear cuenta nueva
                    </Link>
                  </div>
                </>
              )}
            </>
          )}

          <p className="text-center text-white/25 text-xs mt-8 tracking-widest uppercase">
            KanbanBonsai · Umbusk LLC
          </p>
        </div>
      </main>
    </div>
  )
}
