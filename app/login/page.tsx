"use client"

import { useState, useEffect, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

type Stats = { boards: number; cards: number; users: number }

// ── Formulario de login ──
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registered = searchParams.get("registered")
  const reset = searchParams.get("reset")
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const result = await signIn("credentials", { email, password, redirect: false })
      if (result?.error) { setError("Email o contraseña incorrectos"); setLoading(false); return }
      router.push(callbackUrl)
      router.refresh()
    } catch {
      setError("Error al iniciar sesión")
      setLoading(false)
    }
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
      <h2 className="text-white text-xl font-bold mb-6 text-center">Iniciar Sesión</h2>

      {registered && (
        <div className="mb-4 bg-green-500/20 border border-green-400/30 rounded-lg p-3">
          <p className="text-green-200 text-sm">✅ Cuenta creada. Ya puedes iniciar sesión.</p>
        </div>
      )}
      {reset && (
        <div className="mb-4 bg-green-500/20 border border-green-400/30 rounded-lg p-3">
          <p className="text-green-200 text-sm">✅ Clave actualizada exitosamente.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email" required value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
        />
        <input
          type="password" required value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Contraseña"
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
        />
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-white/60 hover:text-white transition-colors">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        {error && (
          <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}
        <button
          type="submit" disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/60">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-green-300 hover:text-green-200 font-medium">
          Regístrate aquí
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-white/30">
        Demo: demo@kanban.com / demo123
      </p>
    </div>
  )
}

// ── Componente de estadísticas animadas ──
function StatCounter({ value, label }: { value: number; label: string }) {
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    const step = Math.ceil(value / 30)
    let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + step, value)
      setDisplay(current)
      if (current >= value) clearInterval(timer)
    }, 40)
    return () => clearInterval(timer)
  }, [value])
  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-white">{display}</div>
      <div className="text-sm text-white/60 mt-1">{label}</div>
    </div>
  )
}

// ── Página principal ──
export default function LandingPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: "linear-gradient(135deg, #0f2027 0%, #1a3a2a 40%, #203a43 70%, #0f2027 100%)"
    }}>

      {/* ── Hero con fondo japonés SVG ── */}
      <div className="relative flex-1 flex flex-col">

        {/* Montañas y luna SVG de fondo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
          <svg viewBox="0 0 1440 600" preserveAspectRatio="xMidYMid slice" className="w-full h-full opacity-30">
            {/* Luna */}
            <circle cx="1100" cy="120" r="70" fill="#fffde7" opacity="0.6"/>
            <circle cx="1100" cy="120" r="72" fill="none" stroke="#fff9c4" strokeWidth="2" opacity="0.3"/>
            {/* Reflejo en agua */}
            <ellipse cx="1100" cy="580" rx="30" ry="60" fill="#fffde7" opacity="0.15"/>
            {/* Montaña fondo */}
            <polygon points="0,500 300,150 600,500" fill="#1b4332" opacity="0.8"/>
            <polygon points="200,500 550,100 900,500" fill="#1a3d2b" opacity="0.9"/>
            <polygon points="500,500 900,200 1200,500" fill="#163829" opacity="0.85"/>
            <polygon points="800,500 1150,180 1440,500" fill="#1b4332" opacity="0.8"/>
            {/* Nieve en cimas */}
            <polygon points="550,100 535,160 565,160" fill="white" opacity="0.4"/>
            <polygon points="900,200 885,255 915,255" fill="white" opacity="0.35"/>
            {/* Lago */}
            <ellipse cx="720" cy="520" rx="500" ry="60" fill="#0d2137" opacity="0.7"/>
            {/* Cerezo izquierdo */}
            <rect x="100" y="380" width="8" height="120" fill="#5d4037" opacity="0.8"/>
            <ellipse cx="104" cy="360" rx="55" ry="45" fill="#f48fb1" opacity="0.5"/>
            <ellipse cx="80" cy="375" rx="35" ry="28" fill="#f48fb1" opacity="0.4"/>
            <ellipse cx="130" cy="370" rx="38" ry="30" fill="#f8bbd0" opacity="0.4"/>
            {/* Cerezo derecho */}
            <rect x="1310" y="360" width="8" height="140" fill="#5d4037" opacity="0.8"/>
            <ellipse cx="1314" cy="340" rx="60" ry="48" fill="#f48fb1" opacity="0.5"/>
            <ellipse cx="1285" cy="355" rx="38" ry="30" fill="#f8bbd0" opacity="0.4"/>
            {/* Pagoda */}
            <rect x="680" y="400" width="80" height="80" fill="#1a2a1a" opacity="0.7"/>
            <polygon points="660,400 720,360 780,400" fill="#2d4a2d" opacity="0.8"/>
            <polygon points="668,370 720,335 772,370" fill="#2d4a2d" opacity="0.7"/>
            <polygon points="676,343 720,315 764,343" fill="#2d4a2d" opacity="0.6"/>
            <rect x="706" y="440" width="28" height="40" fill="#0d1a0d" opacity="0.8"/>
            {/* Estrellas */}
            {[50,150,250,400,600,750,950,1050,1200,1350,180,320,500,700,900,1150].map((x,i) => (
              <circle key={i} cx={x} cy={20 + (i * 17) % 80} r="1.5" fill="white" opacity={0.3 + (i % 3) * 0.2}/>
            ))}
          </svg>
        </div>

        {/* Header público */}
        <div className="relative z-10 flex justify-between items-center px-8 py-6">
          <div className="flex items-center">
            <Image
              src="/logo.png"
              alt="kanbanbonsai"
              width={180}
              height={68}
              className="h-14 w-auto"
            />
          </div>
          <nav className="flex items-center gap-6 text-sm text-white/70">
            <a href="#historia" className="hover:text-white transition-colors">Historia</a>
            <a href="#stats" className="hover:text-white transition-colors">En números</a>
          </nav>
        </div>

        {/* Hero principal */}
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between px-8 lg:px-20 py-12 gap-12 flex-1">

          {/* Lado izquierdo: copy */}
          <div className="flex-1 max-w-lg">
            <div className="inline-block bg-green-800/40 border border-green-500/30 rounded-full px-4 py-1 text-green-300 text-xs font-medium mb-6">
              🌿 Gestión de proyectos con calma y claridad
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              El flujo del
              <span className="text-green-400"> bonsai</span>,<br/>
              la precisión del
              <span className="text-yellow-400"> kanban</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-8">
              Una herramienta colaborativa construida con paciencia, iteración y propósito.
              Como cultivar un bonsai — cada tarea en su lugar, cada equipo en armonía.
            </p>
            <div className="flex gap-4">
              <Link
                href="/register"
                className="bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm"
              >
                Comenzar gratis
              </Link>
              <a
                href="#historia"
                className="border border-white/20 hover:border-white/40 text-white/80 hover:text-white font-medium px-6 py-3 rounded-lg transition-colors text-sm"
              >
                Nuestra historia →
              </a>
            </div>
          </div>

          {/* Lado derecho: login */}
          <div className="w-full max-w-sm">
            <Suspense fallback={<div className="text-white/50 text-sm text-center">Cargando...</div>}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>

      {/* ── Estadísticas reales ── */}
      {stats && (
        <section id="stats" className="relative z-10 border-t border-white/10 py-16 px-8">
          <div className="max-w-3xl mx-auto">
            <p className="text-center text-white/40 text-xs uppercase tracking-widest mb-10">
              En uso ahora mismo
            </p>
            <div className="grid grid-cols-3 gap-8">
              <StatCounter value={stats.users}  label="Usuarios activos" />
              <StatCounter value={stats.boards} label="Tableros creados" />
              <StatCounter value={stats.cards}  label="Tarjetas gestionadas" />
            </div>
          </div>
        </section>
      )}

      {/* ── Historia ── */}
      <section id="historia" className="relative z-10 border-t border-white/10 py-20 px-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-green-400 text-xs uppercase tracking-widest mb-4 text-center">
            El origen
          </p>
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Construido con la herramienta que construye
          </h2>

          <div className="space-y-8 text-white/70 leading-relaxed">
            <div className="flex gap-6">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-800/60 border border-green-500/30 flex items-center justify-center text-green-400 font-bold text-sm">1</div>
              <div>
                <h3 className="text-white font-semibold mb-2">La idea surgió de una necesidad real</h3>
                <p>Umbusk necesitaba gestionar proyectos de tecnología en Venezuela y República Dominicana con equipos distribuidos. Las herramientas existentes eran complejas, costosas, o simplemente demasiado genéricas.</p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-800/60 border border-yellow-500/30 flex items-center justify-center text-yellow-400 font-bold text-sm">2</div>
              <div>
                <h3 className="text-white font-semibold mb-2">La paradoja del tablero vacío</h3>
                <p>Para construir un KANBAN colaborativo, necesitábamos gestionar el propio desarrollo. La solución fue obvia y un poco filosófica: <em>usar KANBAN para construir KANBAN</em>. Cada funcionalidad fue una tarjeta. Cada semana, un sprint.</p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-800/60 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm">3</div>
              <div>
                <h3 className="text-white font-semibold mb-2">Vibe-coded junto a Claude de Anthropic</h3>
                <p>El desarrollo fue una colaboración inusual: un consultor con 45 años de experiencia sin escribir una línea de código, y una IA generando cada componente, explicando cada decisión, corrigiendo cada error. Sprint tras sprint, pestaña tras pestaña.</p>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-800/60 border border-green-500/30 flex items-center justify-center text-green-400 font-bold text-sm">✓</div>
              <div>
                <h3 className="text-white font-semibold mb-2">El resultado: kanbanbonsai</h3>
                <p>Una app en producción, construida en semanas, que demuestra que la combinación de experiencia humana e inteligencia artificial puede crear herramientas reales — simples, útiles y con alma propia. Como un bonsai: pequeño, cuidado, y perfectamente formado.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/10 py-10 px-8">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-3 text-center">
          <span className="text-white/80 font-bold text-lg tracking-tight">
            <span className="text-gray-400">kanban</span>
            <span className="text-green-400">bonsai</span>
          </span>
          <p className="text-sm text-white/40">
            vibe-coded by{" "}
            <a href="https://umbusk.com" target="_blank" rel="noopener noreferrer"
               className="text-green-400 hover:text-green-300 underline">Umbusk</a>
            {" "}y{" "}
            <a href="https://anthropic.com" target="_blank" rel="noopener noreferrer"
               className="text-blue-400 hover:text-blue-300 underline">Claude de Anthropic</a>
          </p>
          <p className="text-xs text-white/20">© 2026 kanbanbonsai · Todos los derechos reservados</p>
        </div>
      </footer>

    </div>
  )
}
