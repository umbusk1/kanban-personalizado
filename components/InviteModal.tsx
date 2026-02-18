'use client'

import { useState } from 'react'

interface InviteModalProps {
  boardId: string
  onClose: () => void
}

export default function InviteModal({ boardId, onClose }: InviteModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleInvite = async () => {
    if (!email.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardId, email: email.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al enviar invitación')
        return
      }

      setSuccess(true)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            📨 Invitar colaborador
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {success ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-gray-700 dark:text-gray-200 font-medium">¡Invitación enviada!</p>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Se envió un email a <strong>{email}</strong>
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full bg-indigo-600 text-white py-2 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email del colaborador
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                placeholder="correo@ejemplo.com"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm
                           dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg p-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 border border-gray-200 dark:border-gray-600 rounded-xl
                           text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleInvite}
                disabled={loading || !email.trim()}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-xl font-semibold
                           hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Enviar invitación'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}