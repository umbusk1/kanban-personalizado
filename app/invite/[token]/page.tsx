'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

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

      router.push(`/board/${data.boardId}`)
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-400">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="text-5xl mb-4">📋</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Invitación a tablero KANBAN
        </h1>

        {session ? (
          // Usuario con sesión activa
          <>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Hola <strong>{session.user?.name || session.user?.email}</strong>,
              haz clic para unirte al tablero.
            </p>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg p-3 mb-6 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleAccept}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold
                         hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : '✅ Aceptar invitación'}
            </button>
          </>
        ) : (
          // Usuario sin sesión: mostrar opciones de login Y registro
          <>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Para aceptar la invitación necesitas una cuenta.
              Si ya tienes una, inicia sesión. Si no, regístrate gratis.
            </p>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg p-3 mb-6 text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Link
                href={`/login?callbackUrl=/invite/${params.token}`}
                className="w-full bg-indigo-600 text-white py-3 px-6 rounded-xl font-semibold
                           hover:bg-indigo-700 transition-colors text-center"
              >
                🔐 Iniciar sesión
              </Link>
              <Link
                href={`/register?callbackUrl=/invite/${params.token}`}
                className="w-full bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400
                           border-2 border-indigo-600 dark:border-indigo-400 py-3 px-6 rounded-xl
                           font-semibold hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors text-center"
              >
                ✨ Crear cuenta nueva
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
