'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        setError('Error al enviar el correo. Intenta de nuevo.')
        return
      }

      setSent(true)
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
            🔐 Recuperar clave
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Te enviaremos un enlace para restablecer tu clave
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="text-5xl">📬</div>
            <p className="text-gray-700 dark:text-gray-200 font-medium">
              ¡Correo enviado!
            </p>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Si <strong>{email}</strong> tiene una cuenta, recibirás un enlace
              para restablecer tu clave. Revisa también tu carpeta de spam.
            </p>
            <Link
              href="/login"
              className="inline-block mt-4 text-blue-600 hover:text-blue-500 font-medium text-sm"
            >
              ← Volver al login
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="appearance-none rounded-lg block w-full px-3 py-2 border border-gray-300
                         dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400
                         text-gray-900 dark:text-white dark:bg-gray-800 focus:outline-none
                         focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Tu email"
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
              {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>

            <div className="text-center">
              <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
                ← Volver al login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
