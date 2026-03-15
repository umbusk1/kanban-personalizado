"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { signIn } from "next-auth/react"

// ── Trama japonesa (idéntica a login/page.tsx) ──
function JapanesePattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="jpPattern" x="0" y="0" width="520" height="520" patternUnits="userSpaceOnUse">
            <text x="-20"  y="170" fontSize="180" fill="#4ade80" opacity="0.045" fontFamily="serif" transform="rotate(-8,-20,170)">盆</text>
            <text x="210"  y="120" fontSize="160" fill="#22c55e" opacity="0.038" fontFamily="serif" transform="rotate(5,210,120)">栽</text>
            <text x="30"   y="420" fontSize="170" fill="#4ade80" opacity="0.042" fontFamily="serif" transform="rotate(-4,30,420)">看</text>
            <text x="290"  y="490" fontSize="175" fill="#16a34a" opacity="0.040" fontFamily="serif" transform="rotate(7,290,490)">板</text>
            <g transform="translate(160,230) rotate(25)" opacity="0.07">
              <ellipse cx="0" cy="0" rx="14" ry="38" fill="#4ade80"/>
              <line x1="0" y1="-38" x2="0" y2="38" stroke="#22c55e" strokeWidth="1.5"/>
              <line x1="0" y1="-10" x2="-10" y2="-24" stroke="#22c55e" strokeWidth="0.8"/>
              <line x1="0" y1="-10" x2="10"  y2="-24" stroke="#22c55e" strokeWidth="0.8"/>
              <line x1="0" y1="8"   x2="-12" y2="-4"  stroke="#22c55e" strokeWidth="0.8"/>
              <line x1="0" y1="8"   x2="12"  y2="-4"  stroke="#22c55e" strokeWidth="0.8"/>
            </g>
            <g transform="translate(430,180) rotate(-18)" opacity="0.065">
              <ellipse cx="0" cy="0" rx="12" ry="32" fill="#86efac"/>
              <line x1="0" y1="-32" x2="0" y2="32" stroke="#4ade80" strokeWidth="1.2"/>
              <line x1="0" y1="-6"  x2="-9"  y2="-18" stroke="#4ade80" strokeWidth="0.7"/>
              <line x1="0" y1="-6"  x2="9"   y2="-18" stroke="#4ade80" strokeWidth="0.7"/>
            </g>
            <g transform="translate(80,350) rotate(42)" opacity="0.06">
              <ellipse cx="0" cy="0" rx="16" ry="44" fill="#22c55e"/>
              <line x1="0" y1="-44" x2="0" y2="44" stroke="#16a34a" strokeWidth="1.8"/>
              <line x1="0" y1="-12" x2="-14" y2="-28" stroke="#16a34a" strokeWidth="1"/>
              <line x1="0" y1="-12" x2="14"  y2="-28" stroke="#16a34a" strokeWidth="1"/>
              <line x1="0" y1="10"  x2="-13" y2="-2"  stroke="#16a34a" strokeWidth="1"/>
              <line x1="0" y1="10"  x2="13"  y2="-2"  stroke="#16a34a" strokeWidth="1"/>
            </g>
            <g transform="translate(390,380) rotate(-33)" opacity="0.055">
              <ellipse cx="0" cy="0" rx="11" ry="30" fill="#4ade80"/>
              <line x1="0" y1="-30" x2="0" y2="30" stroke="#22c55e" strokeWidth="1.2"/>
            </g>
            <g transform="translate(270,290)" opacity="0.065">
              <path d="M0,0 Q-12,-20 0,-44 Q12,-20 0,0" fill="#4ade80"/>
              <line x1="0" y1="0" x2="0" y2="22" stroke="#22c55e" strokeWidth="1.5"/>
            </g>
            <g transform="translate(460,430)" opacity="0.055">
              <path d="M0,0 Q-9,-16 0,-34 Q9,-16 0,0" fill="#86efac"/>
              <line x1="0" y1="0" x2="0" y2="16" stroke="#4ade80" strokeWidth="1.2"/>
            </g>
            <g transform="translate(340,80) rotate(15)" opacity="0.06">
              <ellipse cx="0" cy="0" rx="7" ry="18" fill="#4ade80"/>
              <line x1="0" y1="-18" x2="0" y2="18" stroke="#22c55e" strokeWidth="0.8"/>
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#jpPattern)"/>
      </svg>
    </div>
  )
}

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
      if (!response.ok) { setError(data.error || "Error al registrarse"); setLoading(false); return }
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
      <p className="text-white/50 text-sm text-center mb-6">Únete a kanbanbonsai 🌿</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Nombre (opcional)"
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"/>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"/>
        <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Contraseña (mínimo 6 caracteres)"
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"/>
        {error && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}
        <button type="submit" disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm">
          {loading ? "Creando cuenta..." : "Crear Cuenta"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-white/60">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-green-300 hover:text-green-200 font-medium">Inicia sesión aquí</Link>
      </p>
    </div>
  )
}

const APP_BG = "#0a1a10"

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{
      background: "linear-gradient(135deg, #0a1a10 0%, #0e1f17 30%, #101820 60%, #0a1a10 100%)"
    }}>

      {/* ── Header — fondo sólido, sin trama ── */}
      <header className="relative z-20 border-b border-white/10" style={{ background: APP_BG }}>
        <div className="max-w-lg mx-auto px-8 py-4 flex justify-between items-center">
          <Link href="/login">
            <Image src="/logo.svg" alt="kanbanbonsai" width={200} height={60} className="h-12 w-auto" priority/>
          </Link>
          <Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </header>

      {/* ── Zona con trama ── */}
      <div className="relative flex-1 flex items-center justify-center px-4 py-12">
        <JapanesePattern />
        <div className="relative z-10 w-full max-w-sm">
          <Suspense fallback={<div className="text-white/50 text-sm text-center">Cargando...</div>}>
            <RegisterForm />
          </Suspense>
        </div>
      </div>

      {/* ── Footer — fondo sólido, sin trama ── */}
      <footer className="relative z-20 border-t border-white/10" style={{ background: APP_BG }}>
        <div className="max-w-lg mx-auto px-8 py-5 text-center">
          <p className="text-xs text-white/25">
            © 2026 kanbanbonsai · vibe-coded by{" "}
            <a href="https://umbusk.com" target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white/60">Umbusk</a>
            {" "}y Claude de Anthropic
          </p>
        </div>
      </footer>

    </div>
  )
}
