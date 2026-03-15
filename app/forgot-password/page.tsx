'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

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
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#0d1117]">

      {/* ── Fondo SVG japonés ── */}
      <svg
        className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="bamboo" x="0" y="0" width="60" height="120" patternUnits="userSpaceOnUse">
            {/* Tallo */}
            <rect x="26" y="0" width="8" height="120" fill="#4a7c59" rx="2" />
            {/* Nudos */}
            <rect x="24" y="30" width="12" height="3" fill="#3a6045" rx="1" />
            <rect x="24" y="60" width="12" height="3" fill="#3a6045" rx="1" />
            <rect x="24" y="90" width="12" height="3" fill="#3a6045" rx="1" />
            {/* Hojas */}
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
        {/* Luna */}
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

          {/* Hoja glassmorphism */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl px-8 py-10">

            {sent ? (
              /* Estado: correo enviado */
              <div className="text-center space-y-5">
                <div className="text-6xl">📬</div>
                <h2 className="text-2xl font-bold text-white">¡Correo enviado!</h2>
                <p className="text-white/70 text-sm leading-relaxed">
                  Si <strong className="text-white">{email}</strong> tiene una cuenta,
                  recibirás un enlace para restablecer tu clave.
                  Revisa también tu carpeta de spam.
                </p>
                <Link
                  href="/login"
                  className="inline-block mt-2 text-[#c9a96e] hover:text-[#e0c080] font-medium text-sm transition-colors"
                >
                  ← Volver al login
                </Link>
              </div>
            ) : (
              /* Formulario */
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white tracking-wide">
                    Recuperar clave
                  </h2>
                  <p className="mt-2 text-white/60 text-sm">
                    Te enviaremos un enlace para restablecer tu clave
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-white/70 text-xs font-medium mb-1 uppercase tracking-wider">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20
                                 text-white placeholder-white/40 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-[#c9a96e]/60
                                 focus:border-[#c9a96e]/60 transition"
                    />
                  </div>

                  {error && (
                    <div className="rounded-lg bg-red-500/20 border border-red-400/30 px-4 py-3">
                      <p className="text-sm text-red-300">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-lg font-semibold text-sm
                               bg-[#c9a96e] hover:bg-[#e0c080] text-[#0d1117]
                               transition-all duration-200 shadow-lg
                               disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                  </button>

                  <div className="text-center pt-2">
                    <Link
                      href="/login"
                      className="text-sm text-white/50 hover:text-[#c9a96e] transition-colors"
                    >
                      ← Volver al login
                    </Link>
                  </div>
                </form>
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
