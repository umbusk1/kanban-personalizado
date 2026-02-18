'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Las claves no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La clave debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al restablecer la clave')
        return
      }

      router.push('/login?reset=true')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold">
            🔑 Nueva clave
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Elige una clave nueva para tu cuenta
          </p>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="appearance-none rounded-lg block w-full px-3 py-2 border border-gray-300
                       dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400
                       text-gray-900 dark:text-white dark:bg-gray-800 focus:outline-none
                       focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Nueva clave (mínimo 6 caracteres)"
          />
          <input
            type="password"
            required
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="appearance-none rounded-lg block w-full px-3 py-2 border border-gray-300
                       dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400
                       text-gray-900 dark:text-white dark:bg-gray-800 focus:outline-none
                       focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Confirmar nueva clave"
          />

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm
                       font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700
                       focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando...' : 'Guardar nueva clave'}
          </button>

          <div className="text-center">
            <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
              ← Volver al login
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
