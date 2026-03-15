"use client"

import { useState, useEffect, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

type Stats = { boards: number; cards: number; users: number }

// ── Trama japonesa — 4 kanji del logo + hojas grandes ──
function JapanesePattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="jpPattern" x="0" y="0" width="520" height="520" patternUnits="userSpaceOnUse">
            {/* ── Kanji grandes: 盆 栽 看 板 ── */}
            <text x="-20"  y="170" fontSize="180" fill="#4ade80" opacity="0.045" fontFamily="serif" transform="rotate(-8,-20,170)">盆</text>
            <text x="210"  y="120" fontSize="160" fill="#22c55e" opacity="0.038" fontFamily="serif" transform="rotate(5,210,120)">栽</text>
            <text x="30"   y="420" fontSize="170" fill="#4ade80" opacity="0.042" fontFamily="serif" transform="rotate(-4,30,420)">看</text>
            <text x="290"  y="490" fontSize="175" fill="#16a34a" opacity="0.040" fontFamily="serif" transform="rotate(7,290,490)">板</text>
            {/* ── Hoja grande 1 ── */}
            <g transform="translate(160,230) rotate(25)" opacity="0.07">
              <ellipse cx="0" cy="0" rx="14" ry="38" fill="#4ade80"/>
              <line x1="0" y1="-38" x2="0" y2="38" stroke="#22c55e" strokeWidth="1.5"/>
              <line x1="0" y1="-10" x2="-10" y2="-24" stroke="#22c55e" strokeWidth="0.8"/>
              <line x1="0" y1="-10" x2="10"  y2="-24" stroke="#22c55e" strokeWidth="0.8"/>
              <line x1="0" y1="8"   x2="-12" y2="-4"  stroke="#22c55e" strokeWidth="0.8"/>
              <line x1="0" y1="8"   x2="12"  y2="-4"  stroke="#22c55e" strokeWidth="0.8"/>
            </g>
            {/* ── Hoja grande 2 ── */}
            <g transform="translate(430,180) rotate(-18)" opacity="0.065">
              <ellipse cx="0" cy="0" rx="12" ry="32" fill="#86efac"/>
              <line x1="0" y1="-32" x2="0" y2="32" stroke="#4ade80" strokeWidth="1.2"/>
              <line x1="0" y1="-6"  x2="-9"  y2="-18" stroke="#4ade80" strokeWidth="0.7"/>
              <line x1="0" y1="-6"  x2="9"   y2="-18" stroke="#4ade80" strokeWidth="0.7"/>
            </g>
            {/* ── Hoja grande 3 ── */}
            <g transform="translate(80,350) rotate(42)" opacity="0.06">
              <ellipse cx="0" cy="0" rx="16" ry="44" fill="#22c55e"/>
              <line x1="0" y1="-44" x2="0" y2="44" stroke="#16a34a" strokeWidth="1.8"/>
              <line x1="0" y1="-12" x2="-14" y2="-28" stroke="#16a34a" strokeWidth="1"/>
              <line x1="0" y1="-12" x2="14"  y2="-28" stroke="#16a34a" strokeWidth="1"/>
              <line x1="0" y1="10"  x2="-13" y2="-2"  stroke="#16a34a" strokeWidth="1"/>
              <line x1="0" y1="10"  x2="13"  y2="-2"  stroke="#16a34a" strokeWidth="1"/>
            </g>
            {/* ── Hoja grande 4 ── */}
            <g transform="translate(390,380) rotate(-33)" opacity="0.055">
              <ellipse cx="0" cy="0" rx="11" ry="30" fill="#4ade80"/>
              <line x1="0" y1="-30" x2="0" y2="30" stroke="#22c55e" strokeWidth="1.2"/>
            </g>
            {/* ── Brote grande 1 ── */}
            <g transform="translate(270,290)" opacity="0.065">
              <path d="M0,0 Q-12,-20 0,-44 Q12,-20 0,0" fill="#4ade80"/>
              <line x1="0" y1="0" x2="0" y2="22" stroke="#22c55e" strokeWidth="1.5"/>
            </g>
            {/* ── Brote grande 2 ── */}
            <g transform="translate(460,430)" opacity="0.055">
              <path d="M0,0 Q-9,-16 0,-34 Q9,-16 0,0" fill="#86efac"/>
              <line x1="0" y1="0" x2="0" y2="16" stroke="#4ade80" strokeWidth="1.2"/>
            </g>
            {/* ── Hoja pequeña dispersa ── */}
            <g transform="translate(340,80) rotate(15)" opacity="0.06">
              <ellipse cx="0" cy="0" rx="7" ry="18" fill="#4ade80"/>
              <line x1="0" y1="-18" x2="0" y2="18" stroke="#22c55e" strokeWidth="0.8"/>
            </g>
            <g transform="translate(490,260) rotate(-50)" opacity="0.05">
              <ellipse cx="0" cy="0" rx="6" ry="15" fill="#86efac"/>
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
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 w-full shadow-2xl">
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
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"/>
        <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Contraseña"
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"/>
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
    const step = Math.ceil(value / 30); let current = 0
    const timer = setInterval(() => {
      current = Math.min(current + step, value); setDisplay(current)
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

const features = [
  { icon:"🌿", title:"Sprints",     badge:"Tableros visuales",       color:"green",
    desc:"Organiza tu proyecto en tableros con columnas personalizables. Mueve el trabajo de Pendiente → En progreso → Listo con un clic." },
  { icon:"🍃", title:"Hojas",       badge:"Tareas inteligentes",      color:"emerald",
    desc:"Cada tarea es una Hoja: asigna fechas de inicio y fin, recursos del equipo, prioridad y descripción detallada." },
  { icon:"📋", title:"Bitácora",    badge:"Registro de actividad",    color:"blue",
    desc:"Historial completo de todo lo que ocurre en el Sprint. Quién hizo qué, cuándo y cómo — sin perder ningún detalle." },
  { icon:"📊", title:"Histórico",   badge:"Dashboard triple",         color:"indigo",
    desc:"Vista panorámica en tres columnas: pasado, presente y futuro de tus Sprints. Todo el avance desde un solo lugar." },
  { icon:"👥", title:"Equipos",     badge:"Colaboración real",        color:"yellow",
    desc:"Invita colaboradores por email, asigna roles y trabaja en tiempo real con equipos distribuidos geográficamente." },
  { icon:"⚡", title:"Simplicidad", badge:"Sin curva de aprendizaje", color:"orange",
    desc:"Diseñada para equipos que valoran la claridad. Cero configuración, cero complejidad. Funciona desde el primer día." },
]

type ColorKey = "green"|"emerald"|"blue"|"indigo"|"yellow"|"orange"
const colorMap: Record<ColorKey,{bg:string;border:string;text:string;badge:string}> = {
  green:   {bg:"bg-green-900/20",   border:"border-green-500/20",   text:"text-green-300",   badge:"bg-green-800/40 border-green-500/30 text-green-300"},
  emerald: {bg:"bg-emerald-900/20", border:"border-emerald-500/20", text:"text-emerald-300", badge:"bg-emerald-800/40 border-emerald-500/30 text-emerald-300"},
  blue:    {bg:"bg-blue-900/20",    border:"border-blue-500/20",    text:"text-blue-300",    badge:"bg-blue-800/40 border-blue-500/30 text-blue-300"},
  indigo:  {bg:"bg-indigo-900/20",  border:"border-indigo-500/20",  text:"text-indigo-300",  badge:"bg-indigo-800/40 border-indigo-500/30 text-indigo-300"},
  yellow:  {bg:"bg-yellow-900/20",  border:"border-yellow-500/20",  text:"text-yellow-300",  badge:"bg-yellow-800/40 border-yellow-500/30 text-yellow-300"},
  orange:  {bg:"bg-orange-900/20",  border:"border-orange-500/20",  text:"text-orange-300",  badge:"bg-orange-800/40 border-orange-500/30 text-orange-300"},
}

const historySteps = [
  { num:"0", color:"green",  title:"El método: una pizarra, tres columnas",
    text:"Los japoneses hacen gerencia de proyectos con un concepto muy sencillo: una pizarra y hojitas de post-it. Tres columnas: lo que se debe hacer, lo que se está haciendo y lo ya hecho. Todos ven el avance. Eso es Kanban. KanbanBonsai lo hace digital, simple y accesible." },
  { num:"1", color:"yellow", title:"Nació de una necesidad real",
    text:"Umbusk necesitaba gestionar proyectos en Venezuela, República Dominicana y Panamá con equipos distribuidos. Las herramientas existentes eran complejas, costosas o demasiado genéricas para proyectos ágiles." },
  { num:"2", color:"blue",   title:"La paradoja del tablero vacío",
    text:"Para construir un KANBAN colaborativo, necesitábamos gestionar el propio desarrollo. La solución fue obvia y hasta filosófica: usar KANBAN para construir KANBAN. Cada funcionalidad fue una Hoja. Cada entrega, un Sprint." },
  { num:"3", color:"indigo", title:"Vibe-coded junto a Claude de Anthropic",
    text:"Una colaboración inusual: un consultor con 45 años de experiencia sin escribir una línea de código, y una IA generando cada componente, explicando cada decisión, corrigiendo cada error. Sprint tras sprint, pestaña tras pestaña." },
  { num:"✓", color:"green",  title:"El resultado: kanbanbonsai v2.0",
    text:"Una app en producción que demuestra que la experiencia humana + inteligencia artificial pueden crear herramientas reales, simples y con alma propia. Como un bonsai: pequeño, cuidado y perfectamente formado." },
]

// ── Color sólido del header/footer (igual que fondo de la app) ──
const APP_BG = "#0a1a10"

export default function LandingPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: "linear-gradient(135deg, #0a1a10 0%, #0e1f17 30%, #101820 60%, #0a1a10 100%)"
    }}>

      {/* ── Header — fondo sólido, sin trama ── */}
      <header className="relative z-20 border-b border-white/10" style={{ background: APP_BG }}>
        <div className="max-w-5xl mx-auto px-8 py-4 flex justify-between items-center">
          <Image src="/logo.svg" alt="kanbanbonsai" width={260} height={80} className="h-[80px] w-auto" priority />
          <nav className="flex items-center gap-6 text-sm text-white/60">
            <a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#historia"        className="hover:text-white transition-colors">Historia</a>
            <a href="#stats"           className="hover:text-white transition-colors">En números</a>
          </nav>
        </div>
      </header>

      {/* ── Zona con trama — hero + secciones de contenido ── */}
      <div className="relative flex-1 flex flex-col">
        <JapanesePattern />

        {/* Hero */}
        <section className="relative z-10 py-16 px-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 bg-green-900/40 border border-green-500/30 rounded-full px-4 py-1.5 text-green-300 text-xs font-medium">
                <span>🌱</span>
                <span>v2.0 — Sprints · Hojas · Bitácora · Histórico</span>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row items-center justify-center gap-10">
              <div className="flex-1 max-w-lg text-center lg:text-left">
                <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
                  La herramienta de gestión para equipos que valoran la
                  <span className="text-green-400"> simplicidad</span>
                </h1>
                <p className="text-white/60 text-base leading-relaxed mb-8">
                  Organiza proyectos en <strong className="text-green-300">Sprints</strong>, gestiona tareas
                  como <strong className="text-green-300">Hojas</strong> con fechas y recursos, consulta
                  la <strong className="text-white/80">Bitácora</strong> y sigue el avance en
                  el <strong className="text-white/80">Histórico</strong>.
                </p>
                <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                  <Link href="/register"
                    className="bg-green-600 hover:bg-green-500 text-white font-semibold px-7 py-3 rounded-lg transition-colors text-sm shadow-lg shadow-green-900/30">
                    Comenzar gratis →
                  </Link>
                  <a href="#funcionalidades"
                    className="border border-white/20 hover:border-green-500/40 text-white/70 hover:text-white font-medium px-7 py-3 rounded-lg transition-colors text-sm">
                    Ver funcionalidades
                  </a>
                </div>
                <p className="mt-6 text-xs text-white/25 italic">vibe-coded por Umbusk y Claude de Anthropic 🤖</p>
              </div>
              <div className="w-full max-w-xs">
                <Suspense fallback={<div className="text-white/50 text-sm text-center">Cargando...</div>}>
                  <LoginForm />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        {/* Funcionalidades */}
        <section id="funcionalidades" className="relative z-10 border-t border-white/10 py-24 px-8">
          <div className="max-w-5xl mx-auto">
            <p className="text-green-400 text-xs uppercase tracking-widest mb-3 text-center">Funcionalidades v2.0</p>
            <h2 className="text-3xl font-bold text-white text-center mb-4">Todo lo que necesitas, nada que no</h2>
            <p className="text-white/45 text-center mb-14 max-w-lg mx-auto text-sm">
              Cada funcionalidad fue una Hoja en nuestro propio Sprint de desarrollo.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map(f => {
                const c = colorMap[f.color as ColorKey]
                return (
                  <div key={f.title} className={`${c.bg} border ${c.border} rounded-xl p-6 transition-all hover:scale-[1.02]`}>
                    <div className="text-3xl mb-4">{f.icon}</div>
                    <div className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${c.badge} mb-3`}>{f.badge}</div>
                    <h3 className={`text-lg font-bold ${c.text} mb-2`}>{f.title}</h3>
                    <p className="text-white/55 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Metáfora */}
        <section className="relative z-10 border-t border-white/10 py-20 px-8">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-8">La metáfora</p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              {[
                {emoji:"🌳", label:"Bonsai",  sub:"La plataforma"},
                {arrow:true},
                {emoji:"📋", label:"Sprints", sub:"Los tableros"},
                {arrow:true},
                {emoji:"🍃", label:"Hojas",   sub:"Las tareas"},
              ].map((item,i) =>
                "arrow" in item
                  ? <span key={i} className="text-white/20 text-2xl">→</span>
                  : <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-7 py-5 text-center min-w-[110px]">
                      <div className="text-3xl mb-1">{item.emoji}</div>
                      <div className="text-white font-semibold text-sm">{item.label}</div>
                      <div className="text-white/40 text-xs mt-0.5">{item.sub}</div>
                    </div>
              )}
            </div>
            <p className="mt-8 text-white/40 text-sm max-w-md mx-auto leading-relaxed">
              Como cultivar un bonsai — cada tarea en su lugar, cada equipo en armonía,
              cada Sprint avanzando con disciplina hacia el resultado.
            </p>
          </div>
        </section>

        {/* Estadísticas */}
        {stats && (
          <section id="stats" className="relative z-10 border-t border-white/10 py-16 px-8">
            <div className="max-w-3xl mx-auto">
              <p className="text-center text-white/40 text-xs uppercase tracking-widest mb-10">En uso ahora mismo</p>
              <div className="grid grid-cols-3 gap-8">
                <StatCounter value={stats.users}  label="Usuarios activos" />
                <StatCounter value={stats.boards} label="Sprints creados" />
                <StatCounter value={stats.cards}  label="Hojas gestionadas" />
              </div>
            </div>
          </section>
        )}

        {/* Historia */}
        <section id="historia" className="relative z-10 border-t border-white/10 py-20 px-8">
          <div className="max-w-3xl mx-auto">
            <p className="text-green-400 text-xs uppercase tracking-widest mb-4 text-center">El origen</p>
            <h2 className="text-3xl font-bold text-white text-center mb-4">Construido con la herramienta que construye</h2>
            <p className="text-white/40 text-center text-sm mb-14 max-w-md mx-auto">
              La paradoja de gestionar con KANBAN el desarrollo de KANBAN.
            </p>
            <div className="space-y-8 text-white/65 leading-relaxed">
              {historySteps.map(s => {
                const badge =
                  s.color==="green"  ? "bg-green-800/60 border-green-500/30 text-green-400"
                 :s.color==="yellow" ? "bg-yellow-800/60 border-yellow-500/30 text-yellow-400"
                 :s.color==="blue"   ? "bg-blue-800/60 border-blue-500/30 text-blue-400"
                 :                    "bg-indigo-800/60 border-indigo-500/30 text-indigo-400"
                return (
                  <div key={s.num} className="flex gap-6">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full border ${badge} flex items-center justify-center font-bold text-sm`}>{s.num}</div>
                    <div><h3 className="text-white font-semibold mb-2">{s.title}</h3><p>{s.text}</p></div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="relative z-10 border-t border-white/10 py-24 px-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-5xl mb-6">🌳</div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">¿Listo para cultivar tu primer Sprint?</h2>
            <p className="text-white/50 mb-10 text-lg">Gratis. Sin tarjeta de crédito. Sin complicaciones.</p>
            <Link href="/register"
              className="inline-block bg-green-600 hover:bg-green-500 text-white font-semibold px-12 py-4 rounded-xl transition-colors text-base shadow-xl shadow-green-900/30">
              Comenzar gratis →
            </Link>
          </div>
        </section>
      </div>

      {/* ── Footer — fondo sólido, sin trama ── */}
      <footer className="relative z-20 border-t border-white/10" style={{ background: APP_BG }}>
        <div className="max-w-5xl mx-auto px-8 py-8 flex flex-col items-center gap-3 text-center">
          <Image src="/logo.svg" alt="kanbanbonsai" width={200} height={60} className="h-14 w-auto opacity-100"/>
          <p className="text-sm text-white/40">
            vibe-coded by{" "}
            <a href="https://umbusk.com" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 underline">Umbusk</a>
            {" "}y{" "}
            <a href="https://anthropic.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">Claude de Anthropic</a>
          </p>
          <p className="text-xs text-white/20">© 2026 Umbusk, LLC · Todos los derechos reservados</p>
        </div>
      </footer>

    </div>
  )
}
