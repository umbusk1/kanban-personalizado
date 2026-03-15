"use client"

import { useState, useEffect, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

type Stats = { boards: number; cards: number; users: number }

// ── Nuevo logo SVG inline ──
function BonsaiLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 72" className={className} xmlns="http://www.w3.org/2000/svg" aria-label="KanbanBonsai">
      {/* Tronco */}
      <rect x="22" y="44" width="4" height="16" rx="2" fill="#9ca3af"/>
      {/* Ramas */}
      <path d="M24 44 Q14 33 8 22" stroke="#9ca3af" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M24 44 Q34 31 40 20" stroke="#9ca3af" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M24 44 Q24 34 24 24" stroke="#9ca3af" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* Follaje */}
      <circle cx="24" cy="21" r="11" fill="#16a34a" opacity="0.9"/>
      <circle cx="9"  cy="19" r="9"  fill="#15803d" opacity="0.95"/>
      <circle cx="39" cy="17" r="10" fill="#16a34a" opacity="0.85"/>
      <circle cx="16" cy="12" r="8"  fill="#22c55e" opacity="0.8"/>
      <circle cx="32" cy="10" r="8"  fill="#4ade80" opacity="0.75"/>
      <circle cx="24" cy="8"  r="6"  fill="#86efac" opacity="0.6"/>
      {/* Maceta */}
      <path d="M16 62 L32 62 L35 55 L13 55 Z" fill="#374151"/>
      <rect x="13" y="61" width="22" height="3" rx="1.5" fill="#4b5563"/>
      {/* Texto */}
      <text x="52" y="40" fontFamily="Georgia, serif" fontSize="20" fontWeight="700" fill="#d1d5db" letterSpacing="0.3">kanban</text>
      <text x="52" y="62" fontFamily="Georgia, serif" fontSize="20" fontWeight="700" fill="#4ade80" letterSpacing="0.3">bonsai</text>
      {/* Kanji decorativos */}
      <text x="200" y="44" fontFamily="serif" fontSize="14" fill="#4ade80" opacity="0.35">盆</text>
      <text x="200" y="62" fontFamily="serif" fontSize="14" fill="#9ca3af" opacity="0.25">栽</text>
    </svg>
  )
}

// ── Trama japonesa de fondo ──
function JapanesePattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="jpPattern" x="0" y="0" width="130" height="130" patternUnits="userSpaceOnUse">
            {/* Kanji */}
            <text x="8"   y="28"  fontSize="18" fill="#22c55e" opacity="0.06" fontFamily="serif" transform="rotate(-8,8,28)">看</text>
            <text x="58"  y="18"  fontSize="13" fill="#4ade80" opacity="0.05" fontFamily="serif">板</text>
            <text x="95"  y="50"  fontSize="16" fill="#22c55e" opacity="0.07" fontFamily="serif" transform="rotate(12,95,50)">盆</text>
            <text x="12"  y="78"  fontSize="12" fill="#86efac" opacity="0.05" fontFamily="serif">栽</text>
            <text x="68"  y="95"  fontSize="20" fill="#22c55e" opacity="0.06" fontFamily="serif" transform="rotate(-5,68,95)">葉</text>
            <text x="105" y="108" fontSize="13" fill="#4ade80" opacity="0.05" fontFamily="serif">木</text>
            <text x="32"  y="118" fontSize="15" fill="#22c55e" opacity="0.06" fontFamily="serif" transform="rotate(6,32,118)">芽</text>
            <text x="82"  y="125" fontSize="11" fill="#86efac" opacity="0.04" fontFamily="serif">枝</text>
            {/* Hoja 1 */}
            <g transform="translate(40,55) rotate(30)" opacity="0.09">
              <ellipse cx="0" cy="0" rx="3" ry="6.5" fill="#4ade80"/>
              <line x1="0" y1="-6.5" x2="0" y2="6.5" stroke="#22c55e" strokeWidth="0.5"/>
            </g>
            {/* Hoja 2 */}
            <g transform="translate(78,70) rotate(-22)" opacity="0.07">
              <ellipse cx="0" cy="0" rx="2.5" ry="5.5" fill="#86efac"/>
              <line x1="0" y1="-5.5" x2="0" y2="5.5" stroke="#4ade80" strokeWidth="0.4"/>
            </g>
            {/* Hoja 3 */}
            <g transform="translate(18,100) rotate(48)" opacity="0.08">
              <ellipse cx="0" cy="0" rx="2" ry="4.5" fill="#4ade80"/>
            </g>
            {/* Hoja 4 */}
            <g transform="translate(112,32) rotate(-38)" opacity="0.07">
              <ellipse cx="0" cy="0" rx="3" ry="6" fill="#22c55e"/>
              <line x1="0" y1="-6" x2="0" y2="6" stroke="#4ade80" strokeWidth="0.5"/>
            </g>
            {/* Brote */}
            <g transform="translate(52,100)" opacity="0.08">
              <path d="M0,0 Q-3,-5 0,-11 Q3,-5 0,0" fill="#4ade80"/>
              <line x1="0" y1="0" x2="0" y2="6" stroke="#22c55e" strokeWidth="0.7"/>
            </g>
            {/* Brote 2 */}
            <g transform="translate(115,85)" opacity="0.07">
              <path d="M0,0 Q-2.5,-4 0,-9 Q2.5,-4 0,0" fill="#86efac"/>
              <line x1="0" y1="0" x2="0" y2="5" stroke="#4ade80" strokeWidth="0.6"/>
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#jpPattern)"/>
      </svg>
    </div>
  )
}

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
          type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
        />
        <input
          type="password" required value={password} onChange={e => setPassword(e.target.value)}
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
        <button type="submit" disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-white/60">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="text-green-300 hover:text-green-200 font-medium">Regístrate aquí</Link>
      </p>
      <p className="mt-3 text-center text-xs text-white/30">Demo: demo@kanban.com / demo123</p>
    </div>
  )
}

// ── Contador animado ──
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

// ── Datos de funcionalidades ──
const features = [
  {
    icon: "🌿", title: "Sprints", badge: "Tableros visuales", color: "green",
    desc: "Organiza tu proyecto en tableros con columnas personalizables. Mueve el trabajo de Pendiente → En progreso → Listo con un clic.",
  },
  {
    icon: "🍃", title: "Hojas", badge: "Tarjetas inteligentes", color: "emerald",
    desc: "Cada tarea es una Hoja: asigna fechas de inicio y fin, recursos del equipo, prioridad y descripción detallada.",
  },
  {
    icon: "📋", title: "Bitácora", badge: "Registro de actividad", color: "blue",
    desc: "Historial completo de todo lo que ocurre en el tablero. Quién hizo qué, cuándo y cómo — sin perder ningún detalle.",
  },
  {
    icon: "📊", title: "Histórico", badge: "Dashboard triple", color: "indigo",
    desc: "Vista panorámica en tres columnas: pasado, presente y futuro de tus Sprints. Todo el avance desde un solo lugar.",
  },
  {
    icon: "👥", title: "Equipos", badge: "Colaboración real", color: "yellow",
    desc: "Invita colaboradores por email, asigna roles y trabaja en tiempo real con equipos distribuidos geográficamente.",
  },
  {
    icon: "⚡", title: "Simplicidad", badge: "Sin curva de aprendizaje", color: "orange",
    desc: "Diseñada para equipos que valoran la claridad. Cero configuración, cero complejidad. Funciona desde el primer día.",
  },
]

type ColorKey = "green" | "emerald" | "blue" | "indigo" | "yellow" | "orange"
const colorMap: Record<ColorKey, { bg: string; border: string; text: string; badge: string }> = {
  green:   { bg: "bg-green-900/20",   border: "border-green-500/20",   text: "text-green-300",   badge: "bg-green-800/40 border-green-500/30 text-green-300" },
  emerald: { bg: "bg-emerald-900/20", border: "border-emerald-500/20", text: "text-emerald-300", badge: "bg-emerald-800/40 border-emerald-500/30 text-emerald-300" },
  blue:    { bg: "bg-blue-900/20",    border: "border-blue-500/20",    text: "text-blue-300",    badge: "bg-blue-800/40 border-blue-500/30 text-blue-300" },
  indigo:  { bg: "bg-indigo-900/20",  border: "border-indigo-500/20",  text: "text-indigo-300",  badge: "bg-indigo-800/40 border-indigo-500/30 text-indigo-300" },
  yellow:  { bg: "bg-yellow-900/20",  border: "border-yellow-500/20",  text: "text-yellow-300",  badge: "bg-yellow-800/40 border-yellow-500/30 text-yellow-300" },
  orange:  { bg: "bg-orange-900/20",  border: "border-orange-500/20",  text: "text-orange-300",  badge: "bg-orange-800/40 border-orange-500/30 text-orange-300" },
}

// ── Historia: pasos ──
const historySteps = [
  { num: "0", color: "green",  title: "El método: una pizarra, tres columnas",
    text: "Los japoneses hacen gerencia de proyectos con un concepto muy sencillo: una pizarra y hojitas de post-it. Tres columnas: lo que se debe hacer, lo que se está haciendo y lo ya hecho. Todos ven el avance. Eso es Kanban. KanbanBonsai lo hace digital, simple y accesible." },
  { num: "1", color: "yellow", title: "Nació de una necesidad real",
    text: "Umbusk necesitaba gestionar proyectos en Venezuela, República Dominicana y Panamá con equipos distribuidos. Las herramientas existentes eran complejas, costosas o demasiado genéricas para proyectos ágiles." },
  { num: "2", color: "blue",   title: "La paradoja del tablero vacío",
    text: "Para construir un KANBAN colaborativo, necesitábamos gestionar el propio desarrollo. La solución fue obvia y hasta filosófica: usar KANBAN para construir KANBAN. Cada funcionalidad fue una Hoja. Cada entrega, un Sprint." },
  { num: "3", color: "indigo", title: "Vibe-coded junto a Claude de Anthropic",
    text: "Una colaboración inusual: un consultor con 45 años de experiencia sin escribir una línea de código, y una IA generando cada componente, explicando cada decisión, corrigiendo cada error. Sprint tras sprint, pestaña tras pestaña." },
  { num: "✓", color: "green",  title: "El resultado: kanbanbonsai v2.0",
    text: "Una app en producción que demuestra que la experiencia humana + inteligencia artificial pueden crear herramientas reales, simples y con alma propia. Como un bonsai: pequeño, cuidado y perfectamente formado." },
]

// ── Página principal ──
export default function LandingPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex flex-col relative" style={{
      background: "linear-gradient(135deg, #0a1a10 0%, #0e1f17 30%, #101820 60%, #0a1a10 100%)"
    }}>

      <JapanesePattern />

      {/* ── Header ── */}
      <header className="relative z-10 flex justify-between items-center px-8 py-5 border-b border-white/5">
        <BonsaiLogo className="h-16 w-auto" />
        <nav className="flex items-center gap-6 text-sm text-white/60">
          <a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a>
          <a href="#historia"        className="hover:text-white transition-colors">Historia</a>
          <a href="#stats"           className="hover:text-white transition-colors">En números</a>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 flex flex-col lg:flex-row items-center justify-between px-8 lg:px-20 py-16 gap-12">

        {/* Copy */}
        <div className="flex-1 max-w-xl">
          <div className="inline-flex items-center gap-2 bg-green-900/40 border border-green-500/30 rounded-full px-4 py-1.5 text-green-300 text-xs font-medium mb-8">
            <span>🌱</span>
            <span>v2.0 — Sprints · Hojas · Bitácora · Histórico</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-5">
            La herramienta de gestión para equipos que valoran la
            <span className="text-green-400"> simplicidad</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed mb-10">
            Organiza proyectos en{" "}
            <strong className="text-green-300">Sprints</strong>, gestiona tareas como{" "}
            <strong className="text-green-300">Hojas</strong> con fechas y recursos, consulta la{" "}
            <strong className="text-white/80">Bitácora</strong> y sigue el avance completo en el{" "}
            <strong className="text-white/80">Histórico</strong>.
            Todo con la calma y precisión de un bonsai.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/register"
              className="bg-green-600 hover:bg-green-500 text-white font-semibold px-7 py-3.5 rounded-lg transition-colors text-sm shadow-lg shadow-green-900/30">
              Comenzar gratis →
            </Link>
            <a href="#funcionalidades"
              className="border border-white/20 hover:border-green-500/40 text-white/70 hover:text-white font-medium px-7 py-3.5 rounded-lg transition-colors text-sm">
              Ver funcionalidades
            </a>
          </div>
          <p className="mt-7 text-xs text-white/25 italic">
            vibe-coded por Umbusk y Claude de Anthropic 🤖
          </p>
        </div>

        {/* Login */}
        <div className="w-full max-w-sm">
          <Suspense fallback={<div className="text-white/50 text-sm text-center">Cargando...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </section>

      {/* ── Funcionalidades ── */}
      <section id="funcionalidades" className="relative z-10 border-t border-white/10 py-24 px-8">
        <div className="max-w-5xl mx-auto">
          <p className="text-green-400 text-xs uppercase tracking-widest mb-3 text-center">
            Funcionalidades v2.0
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white text-center mb-4">
            Todo lo que necesitas, nada que no
          </h2>
          <p className="text-white/45 text-center mb-14 max-w-lg mx-auto text-sm">
            Cada funcionalidad fue una Hoja en nuestro propio Sprint de desarrollo. Construido con el método que enseña.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => {
              const c = colorMap[f.color as ColorKey]
              return (
                <div key={f.title} className={`${c.bg} border ${c.border} rounded-xl p-6 transition-all hover:scale-[1.02]`}>
                  <div className="text-3xl mb-4">{f.icon}</div>
                  <div className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${c.badge} mb-3`}>
                    {f.badge}
                  </div>
                  <h3 className={`text-lg font-bold ${c.text} mb-2`}>{f.title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Metáfora Bonsai → Sprints → Hojas ── */}
      <section className="relative z-10 border-t border-white/10 py-20 px-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-white/30 text-xs uppercase tracking-widest mb-8">La metáfora</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {[
              { emoji: "🌳", label: "Bonsai",  sub: "La plataforma" },
              { arrow: true },
              { emoji: "📋", label: "Sprints", sub: "Los tableros" },
              { arrow: true },
              { emoji: "🍃", label: "Hojas",   sub: "Las tareas" },
            ].map((item, i) =>
              "arrow" in item ? (
                <span key={i} className="text-white/20 text-2xl font-light">→</span>
              ) : (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-7 py-5 text-center min-w-[110px]">
                  <div className="text-3xl mb-1">{item.emoji}</div>
                  <div className="text-white font-semibold text-sm">{item.label}</div>
                  <div className="text-white/40 text-xs mt-0.5">{item.sub}</div>
                </div>
              )
            )}
          </div>
          <p className="mt-8 text-white/40 text-sm max-w-md mx-auto leading-relaxed">
            Como cultivar un bonsai — cada tarea en su lugar, cada equipo en armonía,
            cada Sprint avanzando con disciplina hacia el resultado.
          </p>
        </div>
      </section>

      {/* ── Estadísticas ── */}
      {stats && (
        <section id="stats" className="relative z-10 border-t border-white/10 py-16 px-8">
          <div className="max-w-3xl mx-auto">
            <p className="text-center text-white/40 text-xs uppercase tracking-widest mb-10">
              En uso ahora mismo
            </p>
            <div className="grid grid-cols-3 gap-8">
              <StatCounter value={stats.users}  label="Usuarios activos" />
              <StatCounter value={stats.boards} label="Sprints creados" />
              <StatCounter value={stats.cards}  label="Hojas gestionadas" />
            </div>
          </div>
        </section>
      )}

      {/* ── Historia ── */}
      <section id="historia" className="relative z-10 border-t border-white/10 py-20 px-8">
        <div className="max-w-3xl mx-auto">
          <p className="text-green-400 text-xs uppercase tracking-widest mb-4 text-center">El origen</p>
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Construido con la herramienta que construye
          </h2>
          <p className="text-white/40 text-center text-sm mb-14 max-w-md mx-auto">
            La paradoja de gestionar con KANBAN el desarrollo de KANBAN.
          </p>
          <div className="space-y-8 text-white/65 leading-relaxed">
            {historySteps.map((s) => {
              const badge =
                s.color === "green"  ? "bg-green-800/60 border-green-500/30 text-green-400"
                : s.color === "yellow" ? "bg-yellow-800/60 border-yellow-500/30 text-yellow-400"
                : s.color === "blue"   ? "bg-blue-800/60 border-blue-500/30 text-blue-400"
                :                        "bg-indigo-800/60 border-indigo-500/30 text-indigo-400"
              return (
                <div key={s.num} className="flex gap-6">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full border ${badge} flex items-center justify-center font-bold text-sm`}>
                    {s.num}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">{s.title}</h3>
                    <p>{s.text}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="relative z-10 border-t border-white/10 py-24 px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-5xl mb-6">🌳</div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            ¿Listo para cultivar tu primer Sprint?
          </h2>
          <p className="text-white/50 mb-10 text-lg">Gratis. Sin tarjeta de crédito. Sin complicaciones.</p>
          <Link href="/register"
            className="inline-block bg-green-600 hover:bg-green-500 text-white font-semibold px-12 py-4 rounded-xl transition-colors text-base shadow-xl shadow-green-900/30">
            Comenzar gratis →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/10 py-10 px-8">
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-4 text-center">
          <BonsaiLogo className="h-12 w-auto opacity-60" />
          <p className="text-sm text-white/40">
            vibe-coded by{" "}
            <a href="https://umbusk.com" target="_blank" rel="noopener noreferrer"
               className="text-green-400 hover:text-green-300 underline">Umbusk</a>
            {" "}y{" "}
            <a href="https://anthropic.com" target="_blank" rel="noopener noreferrer"
               className="text-blue-400 hover:text-blue-300 underline">Claude de Anthropic</a>
          </p>
          <p className="text-xs text-white/20">© 2026 Umbusk, LLC · Todos los derechos reservados</p>
        </div>
      </footer>

    </div>
  )
}
