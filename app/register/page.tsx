"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || "Error al registrarse")
        setLoading(false)
        return
      }
      await signIn("credentials", { email, password, redirect: false })
      router.push(callbackUrl)
    } catch {
      setError("Error al crear cuenta")
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
      <h2 className="text-white text-xl font-bold mb-2 text-center">Crear cuenta</h2>
      <p className="text-white/50 text-sm text-center mb-6">Únete a kanbanbonsai</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Nombre (opcional)"
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
        />
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
        />
        <input
          type="password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Contraseña (mínimo 6 caracteres)"
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
        />

        {error && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          {loading ? "Creando cuenta..." : "Crear Cuenta"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/60">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-green-300 hover:text-green-200 font-medium">
          Inicia sesión aquí
        </Link>
      </p>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{
      background: "linear-gradient(135deg, #0f2027 0%, #1a3a2a 40%, #203a43 70%, #0f2027 100%)"
    }}>

      {/* Mismo fondo SVG japonés que la landing */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <svg viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice" className="w-full h-full opacity-30">
          <circle cx="1100" cy="120" r="70" fill="#fffde7" opacity="0.6"/>
          <circle cx="1100" cy="120" r="72" fill="none" stroke="#fff9c4" strokeWidth="2" opacity="0.3"/>
          <ellipse cx="1100" cy="580" rx="30" ry="60" fill="#fffde7" opacity="0.15"/>
          <polygon points="0,500 300,150 600,500" fill="#1b4332" opacity="0.8"/>
          <polygon points="200,500 550,100 900,500" fill="#1a3d2b" opacity="0.9"/>
          <polygon points="500,500 900,200 1200,500" fill="#163829" opacity="0.85"/>
          <polygon points="800,500 1150,180 1440,500" fill="#1b4332" opacity="0.8"/>
          <polygon points="550,100 535,160 565,160" fill="white" opacity="0.4"/>
          <polygon points="900,200 885,255 915,255" fill="white" opacity="0.35"/>
          <ellipse cx="720" cy="520" rx="500" ry="60" fill="#0d2137" opacity="0.7"/>
          <rect x="100" y="380" width="8" height="120" fill="#5d4037" opacity="0.8"/>
          <ellipse cx="104" cy="360" rx="55" ry="45" fill="#f48fb1" opacity="0.5"/>
          <ellipse cx="80" cy="375" rx="35" ry="28" fill="#f48fb1" opacity="0.4"/>
          <ellipse cx="130" cy="370" rx="38" ry="30" fill="#f8bbd0" opacity="0.4"/>
          <rect x="1310" y="360" width="8" height="140" fill="#5d4037" opacity="0.8"/>
          <ellipse cx="1314" cy="340" rx="60" ry="48" fill="#f48fb1" opacity="0.5"/>
          <ellipse cx="1285" cy="355" rx="38" ry="30" fill="#f8bbd0" opacity="0.4"/>
          <rect x="680" y="400" width="80" height="80" fill="#1a2a1a" opacity="0.7"/>
          <polygon points="660,400 720,360 780,400" fill="#2d4a2d" opacity="0.8"/>
          <polygon points="668,370 720,335 772,370" fill="#2d4a2d" opacity="0.7"/>
          <polygon points="676,343 720,315 764,343" fill="#2d4a2d" opacity="0.6"/>
          <rect x="706" y="440" width="28" height="40" fill="#0d1a0d" opacity="0.8"/>
          {[50,150,250,400,600,750,950,1050,1200,1350,180,320,500,700,900,1150].map((x,i) => (
            <circle key={i} cx={x} cy={20 + (i * 17) % 80} r="1.5" fill="white" opacity={0.3 + (i % 3) * 0.2}/>
          ))}
        </svg>
      </div>

      {/* Header público */}
      <div className="relative z-10 flex justify-between items-center px-8 py-6">
        <Link href="/login" className="flex items-center gap-3">
          <span className="text-3xl">🎋</span>
          <span className="text-white font-bold text-2xl tracking-tight">
            <span className="text-gray-300">kanban</span>
            <span className="text-green-400">bonsai</span>
          </span>
        </Link>
        <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">
          ← Volver al inicio
        </Link>
      </div>

      {/* Formulario centrado */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Suspense fallback={<div className="text-white/50 text-sm text-center">Cargando...</div>}>
            <RegisterForm />
          </Suspense>
        </div>
      </div>

      {/* Footer mínimo */}
      <div className="relative z-10 text-center pb-8 text-xs text-white/20">
        © 2026 kanbanbonsai · vibe-coded by{" "}
        <a href="https://umbusk.com" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/60">
          Umbusk
        </a>
        {" "}y Claude de Anthropic
      </div>
    </div>
  )
}
