'use client'

import { useState, useEffect, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"

type Stats = { boards: number; cards: number; users: number }

// ── Trama japonesa ──
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
              <ellipse cx="0" cy="0" rx="10" ry="28" fill="#22c55e"/>
              <line x1="0" y1="-28" x2="0" y2="28" stroke="#16a34a" strokeWidth="1"/>
            </g>
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
    e.preventDefault(); setError(""); setLoading(true)
    try {
      const result = await signIn("credentials", { email, password, redirect: false })
      if (result?.error) { setError("Email o contraseña incorrectos"); setLoading(false); return }
      router.push(callbackUrl); router.refresh()
    } catch { setError("Error al iniciar sesión"); setLoading(false) }
  }

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 w-full shadow-2xl">
      <h2 className="text-white text-xl font-bold mb-6 text-center">Iniciar Sesión</h2>
      {registered && <div className="mb-4 bg-green-500/20 border border-green-400/30 rounded-lg p-3"><p className="text-green-200 text-sm">✅ Cuenta creada. Ya puedes iniciar sesión.</p></div>}
      {reset      && <div className="mb-4 bg-green-500/20 border border-green-400/30 rounded-lg p-3"><p className="text-green-200 text-sm">✅ Clave actualizada exitosamente.</p></div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"/>
        <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña"
          className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"/>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-white/60 hover:text-white transition-colors">¿Olvidaste tu contraseña?</Link>
        </div>
        {error && <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3"><p className="text-red-200 text-sm">{error}</p></div>}
        <button type="submit" disabled={loading}
          className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors text-sm">
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-white/60">¿No tienes cuenta?{" "}
        <Link href="/register" className="text-green-300 hover:text-green-200 font-medium">Regístrate aquí</Link></p>
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

// ── Tipos ──
type ColorKey = "green" | "emerald" | "teal" | "blue" | "indigo" | "yellow" | "purple"

interface Feature {
  icon: string
  title: string
  badge: string
  color: ColorKey
  desc: string
  isNew?: boolean
  modal: {
    headline: string
    body: string
    bullets: string[]
    footer: string
  }
}

// ── Mapa de colores ──
const colorMap: Record<ColorKey, { bg: string; border: string; text: string; badge: string; modalAccent: string }> = {
  green:   { bg:"bg-green-900/20",   border:"border-green-500/20",   text:"text-green-300",   badge:"bg-green-800/40 border-green-500/30 text-green-300",   modalAccent:"border-green-500/40" },
  emerald: { bg:"bg-emerald-900/20", border:"border-emerald-500/20", text:"text-emerald-300", badge:"bg-emerald-800/40 border-emerald-500/30 text-emerald-300", modalAccent:"border-emerald-500/40" },
  teal:    { bg:"bg-teal-900/20",    border:"border-teal-500/20",    text:"text-teal-300",    badge:"bg-teal-800/40 border-teal-500/30 text-teal-300",    modalAccent:"border-teal-500/40" },
  blue:    { bg:"bg-blue-900/20",    border:"border-blue-500/20",    text:"text-blue-300",    badge:"bg-blue-800/40 border-blue-500/30 text-blue-300",    modalAccent:"border-blue-500/40" },
  indigo:  { bg:"bg-indigo-900/20",  border:"border-indigo-500/20",  text:"text-indigo-300",  badge:"bg-indigo-800/40 border-indigo-500/30 text-indigo-300",  modalAccent:"border-indigo-500/40" },
  yellow:  { bg:"bg-yellow-900/20",  border:"border-yellow-500/20",  text:"text-yellow-300",  badge:"bg-yellow-800/40 border-yellow-500/30 text-yellow-300",  modalAccent:"border-yellow-500/40" },
  purple:  { bg:"bg-purple-900/20",  border:"border-purple-500/20",  text:"text-purple-300",  badge:"bg-purple-800/40 border-purple-500/30 text-purple-300",  modalAccent:"border-purple-500/40" },
}

// ── Modal de funcionalidad ──
function FeatureModal({ feature, onClose }: { feature: Feature; onClose: () => void }) {
  const c = colorMap[feature.color]
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className={`relative bg-[#0e1f17] border ${c.modalAccent} rounded-2xl p-8 max-w-lg w-full shadow-2xl`}
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white text-xl leading-none transition-colors">✕</button>
        <div className="flex items-center gap-3 mb-5">
          <span className="text-4xl">{feature.icon}</span>
          <div>
            <div className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${c.badge} mb-1`}>
              {feature.badge}
            </div>
            <h3 className={`text-xl font-bold ${c.text}`}>{feature.modal.headline}</h3>
          </div>
        </div>
        <p className="text-white/70 text-sm leading-relaxed mb-5">{feature.modal.body}</p>
        <ul className="space-y-2 mb-6">
          {feature.modal.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-white/65">
              <span className={`mt-0.5 flex-shrink-0 ${c.text}`}>🍃</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className={`border-t ${c.modalAccent} pt-4`}>
          <p className={`text-xs italic ${c.text} opacity-80`}>{feature.modal.footer}</p>
        </div>
      </div>
    </div>
  )
}

// ── Funcionalidades v4.0 ──
const features: Feature[] = [
  {
    icon: "🌳", title: "Bonsais", badge: "Proyectos completos", color: "purple", isNew: true,
    desc: "Un Bonsai es un proyecto mayor que agrupa múltiples Sprints. La capa que faltaba para gestionar proyectos complejos con visión completa.",
    modal: {
      headline: "El Bonsai: tu proyecto completo",
      body: "Un Bonsai es un proyecto mayor compuesto por múltiples Sprints. Cada Sprint representa una etapa con un resultado concreto. Desde un plan de mercadeo hasta la organización de un evento — todo cabe en un Bonsai.",
      bullets: [
        "Agrupa 2 a 7 Sprints en un solo proyecto con visión completa",
        "Ve el progreso de todos los Sprints desde un solo dashboard",
        "Histórico de proyectos completados organizado por fecha",
        "Acordeón visual: navega los Sprints de cada Bonsai sin salir de la vista",
        "Crea Bonsais manualmente o genera uno completo con IA en segundos",
      ],
      footer: "Del QUÉ al CÓMO: describe tu proyecto y KanbanBonsai lo estructura por ti.",
    },
  },
  {
    icon: "✨", title: "Agente IA", badge: "Generación con Claude", color: "yellow", isNew: true,
    desc: "Describe lo que quieres lograr en lenguaje natural. El Agente genera el Bonsai completo o el Sprint con sus Hojas, aplicando criterio MECE y principio de Minto.",
    modal: {
      headline: "Del QUÉ al CÓMO en segundos",
      body: "El cuello de botella de cualquier proyecto siempre fue el mismo: ¿cómo lo estructuro? ¿por dónde empiezo? ¿cómo lo explico al equipo? El Agente IA de KanbanBonsai elimina esa barrera. Describes lo que quieres lograr y Claude lo convierte en un plan ejecutable.",
      bullets: [
        "Genera un Sprint completo con Hojas estructuradas desde un brief de texto libre",
        "Genera un Bonsai completo con múltiples Sprints para proyectos mayores",
        "Aplica el Principio de la Pirámide de Minto: categorías MECE en cada nivel",
        "Respeta los límites cognitivos de Miller: máximo 7 elementos por nivel",
        "Guarda el prompt original para editarlo y re-generar si el resultado no te convence",
        "Badge ✨ que distingue lo generado con IA de lo creado manualmente",
      ],
      footer: "Plan gratuito: 1 Bonsai y 3 Sprints generados con IA por semana. Se renueva cada lunes.",
    },
  },
  {
    icon: "🌿", title: "Sprints", badge: "Tableros visuales", color: "green",
    desc: "Organiza cada etapa de tu proyecto en un tablero con tres columnas: Por Hacer, En Progreso y Completado. Mueve Hojas con un clic.",
    modal: {
      headline: "El Sprint: tu tablero de mando",
      body: "Un Sprint es un tablero visual dividido en tres columnas que representan el estado de cada tarea: Por Hacer, En Progreso y Completado. De un vistazo, tú y tu equipo saben exactamente en qué punto está cada parte del proyecto.",
      bullets: [
        "Tres columnas claras: Por Hacer, En Progreso, Completado",
        "Mueve Hojas entre columnas con drag & drop o con un clic",
        "Barra de progreso automática basada en subtareas completadas",
        "Fecha límite, prioridad y asignación de responsable por Hoja",
        "Bitácora de actividad: registro cronológico de todos los movimientos",
      ],
      footer: "Un Sprint bien diseñado es como una rama de bonsai: cada elemento tiene su lugar y propósito.",
    },
  },
  {
    icon: "🍃", title: "Hojas", badge: "Tareas con contexto", color: "emerald",
    desc: "Cada Hoja es una tarea con título, descripción, subtareas en markdown, prioridad, fecha límite y responsable asignado.",
    modal: {
      headline: "La Hoja: la unidad mínima de trabajo",
      body: "Una Hoja es mucho más que una tarea. Es una unidad de trabajo con todo el contexto necesario para que cualquier miembro del equipo pueda ejecutarla sin preguntar.",
      bullets: [
        "Título orientado a la acción",
        "Descripción con subtareas en formato markdown: - [ ] acción",
        "Barra de progreso automática según subtareas marcadas",
        "Prioridad: Alta, Media o Baja",
        "Fecha límite con indicador visual de urgencia",
        "Asignación a un miembro específico del equipo",
      ],
      footer: "Como las hojas de un bonsai: pequeñas, precisas, y cada una en su lugar exacto.",
    },
  },
  {
    icon: "🔗", title: "Precedencia", badge: "Dependencias inteligentes", color: "teal",
    desc: "Define qué Hojas o Sprints deben completarse antes de iniciar otros. El sistema te alerta si intentas avanzar fuera de orden.",
    modal: {
      headline: "Precedencia: el orden importa",
      body: "En proyectos reales, no todo puede hacerse al mismo tiempo ni en cualquier orden. La Precedencia te permite establecer dependencias entre Hojas y entre Sprints, reflejando la lógica real de tu proyecto.",
      bullets: [
        "Marca una Hoja como bloqueada por otra Hoja que debe completarse primero",
        "Establece que un Sprint no puede iniciarse hasta que otro esté cerrado",
        "Visualiza las dependencias con indicadores de bloqueo en cada Hoja afectada",
        "Ideal para proyectos de construcción, tecnología, eventos o cualquier proceso secuencial",
      ],
      footer: "Como en un bonsai: no puedes dar forma a las ramas superiores antes de que el tronco esté firme.",
    },
  },
  {
    icon: "👥", title: "Equipos", badge: "Colaboración real", color: "blue",
    desc: "Invita colaboradores por email, asigna roles y trabaja en tiempo real con equipos distribuidos geográficamente.",
    modal: {
      headline: "Equipos: gestión sin fronteras",
      body: "KanbanBonsai nació para equipos distribuidos geográficamente. Desde el primer día, la colaboración es una función central — no un añadido.",
      bullets: [
        "Invita a cualquier persona por email con un enlace seguro de un solo uso",
        "Dos roles: Propietario (control total) y Colaborador (edición de Hojas)",
        "Cada miembro ve en tiempo real los cambios de sus compañeros",
        "Asigna Hojas específicas a miembros específicos del equipo",
        "Notificaciones por email cuando te asignan o editan una Hoja",
        "Gestiona múltiples equipos en diferentes Sprints simultáneamente",
      ],
      footer: "Equipos en Venezuela, República Dominicana y Panamá trabajando en el mismo tablero — así nació KanbanBonsai.",
    },
  },
  {
    icon: "📋", title: "Bitácora", badge: "Registro de actividad", color: "indigo",
    desc: "Historial completo de todo lo que ocurre en el Sprint. Quién hizo qué, cuándo y cómo — sin perder ningún detalle.",
    modal: {
      headline: "La Bitácora: memoria perfecta del equipo",
      body: "La Bitácora es el registro cronológico e inmutable de todas las acciones realizadas en un Sprint. No hay que preguntar '¿quién cambió esto?' — la Bitácora lo sabe.",
      bullets: [
        "Registro automático de cada movimiento de Hoja entre columnas",
        "Historial de ediciones con marca de tiempo y autoría",
        "Filtrable por fecha, usuario o tipo de acción",
        "Exportable para reportes de avance o auditorías del proyecto",
      ],
      footer: "La transparencia es la base de la confianza en equipos distribuidos.",
    },
  },
]

// ── Historia ──
const historySteps = [
  { num:"0", color:"green",  title:"El método: una pizarra, tres columnas",
    text:"Los japoneses hacen gerencia de proyectos con un concepto muy sencillo: una pizarra y hojitas de post-it. Tres columnas: lo que se debe hacer, lo que se está haciendo y lo ya hecho. Todos ven el avance. Eso es Kanban. KanbanBonsai lo hace digital, simple y accesible." },
  { num:"1", color:"yellow", title:"Nació de una necesidad real",
    text:"Umbusk necesitaba gestionar proyectos en Venezuela, República Dominicana y Panamá con equipos distribuidos. Las herramientas existentes eran complejas, costosas o demasiado genéricas para proyectos ágiles." },
  { num:"2", color:"blue",   title:"La paradoja del tablero vacío",
    text:"Para construir un KANBAN colaborativo, necesitábamos gestionar el propio desarrollo. La solución fue obvia y hasta filosófica: usar KANBAN para construir KANBAN. Cada funcionalidad fue una Hoja. Cada entrega, un Sprint." },
  { num:"3", color:"indigo", title:"Vibe-coded junto a Claude de Anthropic",
    text:"Una colaboración inusual: un consultor con 45 años de experiencia sin escribir una línea de código, y una IA generando cada componente, explicando cada decisión, corrigiendo cada error. Sprint tras sprint, pestaña tras pestaña." },
  { num:"4", color:"purple", title:"v4.0: ahora en tu bolsillo",
    text:"La interfaz completa se adapta a dispositivos móviles. Tablero con pestañas, mover hojas con un toque, bonsais y dashboard como tarjetas expandibles. Construido — como siempre — usando KanbanBonsai para gestionar el desarrollo de KanbanBonsai." },
  { num:"✓", color:"green",  title:"El resultado: kanbanbonsai v4.0",
    text:"Una app en producción que demuestra que la experiencia humana + inteligencia artificial pueden crear herramientas reales, simples y con alma propia. Como un bonsai: pequeño, cuidado y perfectamente formado." },
]

const APP_BG = "#0a1a10"

// ── Página principal ──
export default function LandingPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [activeFeature, setActiveFeature] = useState<Feature | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  useEffect(() => {
    if (activeFeature) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [activeFeature])

  return (
    <div className="min-h-screen flex flex-col" style={{
      background: "linear-gradient(135deg, #0a1a10 0%, #0e1f17 30%, #101820 60%, #0a1a10 100%)"
    }}>

      {activeFeature && (
        <FeatureModal feature={activeFeature} onClose={() => setActiveFeature(null)} />
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-white/10" style={{ background: APP_BG }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <Image
            src="/logo.svg"
            alt="kanbanbonsai"
            width={260}
            height={80}
            className="h-[50px] md:h-[80px] w-auto"
            priority
          />
          <nav className="hidden md:flex items-center gap-6 text-sm text-white/60">
            <a href="#novedades"       className="hover:text-white transition-colors">v4.0</a>
            <a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a>
            <a href="#historia"        className="hover:text-white transition-colors">Historia</a>
            <a href="#stats"           className="hover:text-white transition-colors">En números</a>
          </nav>
          <button
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5
                       rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 transition-colors"
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label="Abrir menú"
          >
            <span className={`block w-5 h-0.5 bg-white/70 transition-transform duration-200 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-5 h-0.5 bg-white/70 transition-opacity duration-200 ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-white/70 transition-transform duration-200 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
        {menuOpen && (
          <nav className="md:hidden border-t border-white/10 px-6 py-3 flex flex-col gap-1" style={{ background: APP_BG }}>
            <a href="#novedades" onClick={() => setMenuOpen(false)}
               className="py-2.5 text-sm text-white/70 hover:text-white border-b border-white/8 transition-colors">v4.0</a>
            <a href="#funcionalidades" onClick={() => setMenuOpen(false)}
               className="py-2.5 text-sm text-white/70 hover:text-white border-b border-white/8 transition-colors">Funcionalidades</a>
            <a href="#historia" onClick={() => setMenuOpen(false)}
               className="py-2.5 text-sm text-white/70 hover:text-white border-b border-white/8 transition-colors">Historia</a>
            <a href="#stats" onClick={() => setMenuOpen(false)}
               className="py-2.5 text-sm text-white/70 hover:text-white transition-colors">En números</a>
          </nav>
        )}
      </header>

      <div className="relative flex-1 flex flex-col">
        <JapanesePattern />

        {/* ── Hero ── */}
        <section className="relative z-10 py-12 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 bg-purple-900/40 border border-purple-500/30 rounded-full px-4 py-1.5 text-purple-300 text-xs font-medium">
                <span>✨</span>
                <span>v4.0 — Bonsais · Agente IA · Sprints · Hojas · Bitácora · Móvil</span>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row items-center justify-center gap-10">
              <div className="flex-1 max-w-lg text-center lg:text-left">
                <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight mb-5">
                  Del <span className="text-white/50">QUÉ</span> al{" "}
                  <span className="text-green-400">CÓMO</span>{" "}
                  en segundos
                </h1>
                <p className="text-white/60 text-base leading-relaxed mb-4">
                  Describe tu proyecto en lenguaje natural.
                  KanbanBonsai y Claude lo convierten en un plan ejecutable al instante — con{" "}
                  <strong className="text-purple-300">Bonsais</strong>,{" "}
                  <strong className="text-green-300">Sprints</strong> y{" "}
                  <strong className="text-emerald-300">Hojas</strong> listos para trabajar.
                </p>
                <p className="text-white/40 text-sm leading-relaxed mb-8">
                  Sin manuales. Sin reuniones de planificación de 3 horas. Sin la barrera del ¿por dónde empiezo?
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

        {/* ── v4.0 — Anuncio responsive ── */}
        <section id="novedades" className="relative z-10 border-t border-white/10 py-16 px-6">
          <div className="max-w-5xl mx-auto">

            {/* Badge + título */}
            <div className="flex justify-center mb-3">
              <div className="inline-flex items-center gap-2 bg-green-900/40 border border-green-500/30 rounded-full px-4 py-1.5 text-green-300 text-xs font-medium">
                📱 v4.0 — ahora disponible
              </div>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white text-center mb-3">
              KanbanBonsai ahora en tu bolsillo
            </h2>
            <p className="text-white/50 text-center text-sm leading-relaxed mb-10 max-w-xl mx-auto">
              La interfaz completa se adapta a dispositivos móviles. Gestiona tus proyectos desde cualquier lugar, con la misma potencia que en desktop.
            </p>

            {/* Mockups SVG */}
            <div className="mb-10 overflow-hidden rounded-2xl border border-white/10 bg-white/3 p-4 sm:p-8">
              <svg width="100%" viewBox="0 0 640 220" role="img" xmlns="http://www.w3.org/2000/svg">
                <title>Pantallas móviles de KanbanBonsai v4.0</title>
                <desc>Landing page, dashboard y tablero kanban adaptados para móvil, junto al bonsai del proyecto responsive</desc>

                {/* Teléfono 1: Landing */}
                <g transform="translate(20, 10)">
                  <rect x="0" y="0" width="105" height="185" rx="12" fill="#0a1a10" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5"/>
                  <rect x="35" y="3" width="35" height="4" rx="2" fill="rgba(255,255,255,0.12)"/>
                  <rect x="0" y="10" width="105" height="18" fill="#0a1a10"/>
                  <rect x="7" y="14" width="44" height="8" rx="4" fill="#1a3a1a"/>
                  <rect x="88" y="14" width="10" height="8" rx="3" fill="rgba(255,255,255,0.08)"/>
                  <line x1="2" y1="27" x2="103" y2="27" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
                  <rect x="15" y="34" width="75" height="10" rx="5" fill="rgba(168,85,247,0.2)" stroke="rgba(168,85,247,0.35)" strokeWidth="0.5"/>
                  <text x="52" y="42" textAnchor="middle" fontSize="6" fill="#c4b5fd" fontFamily="sans-serif">v4.0 · Bonsais · IA · Móvil</text>
                  <rect x="10" y="50" width="52" height="7" rx="3" fill="rgba(255,255,255,0.75)"/>
                  <rect x="10" y="61" width="40" height="7" rx="3" fill="#4ade80"/>
                  <rect x="10" y="75" width="85" height="3" rx="1.5" fill="rgba(255,255,255,0.18)"/>
                  <rect x="10" y="82" width="68" height="3" rx="1.5" fill="rgba(255,255,255,0.12)"/>
                  <rect x="14" y="92" width="77" height="15" rx="5" fill="#16a34a"/>
                  <text x="52" y="103" textAnchor="middle" fontSize="6" fill="#fff" fontFamily="sans-serif">Comenzar gratis →</text>
                  <rect x="7" y="114" width="91" height="55" rx="7" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
                  <rect x="14" y="122" width="77" height="10" rx="4" fill="rgba(255,255,255,0.07)"/>
                  <rect x="14" y="136" width="77" height="10" rx="4" fill="rgba(255,255,255,0.07)"/>
                  <rect x="14" y="150" width="77" height="12" rx="4" fill="#16a34a"/>
                  <text x="52" y="159" textAnchor="middle" fontSize="6" fill="#fff" fontFamily="sans-serif">Iniciar sesión</text>
                  <text x="52" y="200" textAnchor="middle" fontSize="8" fill="#4ade80" fontFamily="sans-serif">Landing</text>
                </g>

                {/* Flecha 1→2 */}
                <line x1="132" y1="100" x2="155" y2="100" stroke="#4ade80" strokeWidth="1" strokeDasharray="3,2"/>
                <polygon points="155,97 160,100 155,103" fill="#4ade80"/>

                {/* Teléfono 2: Dashboard */}
                <g transform="translate(163, 10)">
                  <rect x="0" y="0" width="105" height="185" rx="12" fill="#111827" stroke="rgba(255,255,255,0.13)" strokeWidth="1.5"/>
                  <rect x="35" y="3" width="35" height="4" rx="2" fill="rgba(255,255,255,0.08)"/>
                  <rect x="0" y="10" width="105" height="18" fill="#111827"/>
                  <rect x="7" y="14" width="44" height="8" rx="4" fill="rgba(255,255,255,0.06)"/>
                  <rect x="88" y="14" width="10" height="8" rx="3" fill="rgba(255,255,255,0.06)"/>
                  <line x1="2" y1="27" x2="103" y2="27" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
                  <text x="7" y="40" fontSize="7" fill="rgba(255,255,255,0.7)" fontWeight="500" fontFamily="sans-serif">Bienvenido, Moisesp</text>
                  <rect x="68" y="31" width="16" height="9" rx="3" fill="#7c3aed"/>
                  <rect x="86" y="31" width="14" height="9" rx="3" fill="#4338ca"/>
                  <text x="7" y="53" fontSize="6" fill="#818cf8" fontFamily="sans-serif">🔄 EN PROCESO · 7 ACTIVOS</text>
                  <rect x="7" y="58" width="91" height="30" rx="5" fill="rgba(99,102,241,0.1)" stroke="rgba(99,102,241,0.25)" strokeWidth="0.5"/>
                  <rect x="13" y="64" width="58" height="5" rx="2.5" fill="rgba(255,255,255,0.65)"/>
                  <rect x="13" y="73" width="26" height="5" rx="2.5" fill="#818cf8"/>
                  <rect x="42" y="73" width="20" height="5" rx="2.5" fill="rgba(255,255,255,0.18)"/>
                  <rect x="13" y="82" width="85" height="2" rx="1" fill="rgba(255,255,255,0.08)"/>
                  <rect x="13" y="82" width="36" height="2" rx="1" fill="#4ade80"/>
                  <rect x="7" y="92" width="91" height="24" rx="5" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
                  <rect x="13" y="98" width="48" height="5" rx="2.5" fill="rgba(255,255,255,0.45)"/>
                  <rect x="13" y="107" width="26" height="5" rx="2.5" fill="#818cf8"/>
                  <rect x="7" y="120" width="91" height="24" rx="5" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
                  <rect x="13" y="126" width="55" height="5" rx="2.5" fill="rgba(255,255,255,0.35)"/>
                  <rect x="13" y="135" width="26" height="5" rx="2.5" fill="#818cf8"/>
                  <text x="52" y="200" textAnchor="middle" fontSize="8" fill="#4ade80" fontFamily="sans-serif">Dashboard</text>
                </g>

                {/* Flecha 2→3 */}
                <line x1="275" y1="100" x2="298" y2="100" stroke="#4ade80" strokeWidth="1" strokeDasharray="3,2"/>
                <polygon points="298,97 303,100 298,103" fill="#4ade80"/>

                {/* Teléfono 3: Tablero */}
                <g transform="translate(306, 10)">
                  <rect x="0" y="0" width="105" height="185" rx="12" fill="#111827" stroke="rgba(255,255,255,0.13)" strokeWidth="1.5"/>
                  <rect x="35" y="3" width="35" height="4" rx="2" fill="rgba(255,255,255,0.08)"/>
                  <rect x="0" y="10" width="105" height="18" fill="#111827"/>
                  <rect x="7" y="14" width="44" height="8" rx="4" fill="rgba(255,255,255,0.06)"/>
                  <rect x="88" y="14" width="10" height="8" rx="3" fill="rgba(255,255,255,0.06)"/>
                  <line x1="2" y1="27" x2="103" y2="27" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>
                  <text x="7" y="39" fontSize="7" fill="rgba(255,255,255,0.7)" fontWeight="500" fontFamily="sans-serif">Sprint · Dashboard móvil</text>
                  {/* pestañas con números */}
                  <circle cx="20" cy="56" r="9" fill="rgba(255,255,255,0.08)"/>
                  <text x="20" y="60" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.35)" fontFamily="sans-serif">4</text>
                  <text x="20" y="72" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.3)" fontFamily="sans-serif">Por Hacer</text>
                  <circle cx="52" cy="56" r="9" fill="#4338ca"/>
                  <text x="52" y="60" textAnchor="middle" fontSize="7" fill="#fff" fontFamily="sans-serif">1</text>
                  <text x="52" y="72" textAnchor="middle" fontSize="6" fill="#818cf8" fontFamily="sans-serif">En Progreso</text>
                  <line x1="35" y1="77" x2="69" y2="77" stroke="#818cf8" strokeWidth="1.5"/>
                  <circle cx="85" cy="56" r="9" fill="rgba(255,255,255,0.08)"/>
                  <text x="85" y="60" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.35)" fontFamily="sans-serif">2</text>
                  <text x="85" y="72" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.3)" fontFamily="sans-serif">Completado</text>
                  <line x1="3" y1="77" x2="102" y2="77" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5"/>
                  {/* tarjeta */}
                  <rect x="7" y="83" width="91" height="46" rx="5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
                  <rect x="7" y="83" width="3" height="46" rx="0" fill="#eab308"/>
                  <rect x="14" y="89" width="60" height="5" rx="2.5" fill="rgba(255,255,255,0.65)"/>
                  <rect x="14" y="98" width="76" height="3" rx="1.5" fill="rgba(255,255,255,0.18)"/>
                  <rect x="14" y="105" width="50" height="3" rx="1.5" fill="rgba(255,255,255,0.12)"/>
                  <rect x="14" y="112" width="76" height="2" rx="1" fill="rgba(255,255,255,0.08)"/>
                  <rect x="14" y="112" width="38" height="2" rx="1" fill="#4ade80"/>
                  <line x1="7" y1="120" x2="98" y2="120" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5"/>
                  <text x="28" y="128" textAnchor="middle" fontSize="6" fill="#818cf8" fontFamily="sans-serif">✏️ Editar</text>
                  <line x1="56" y1="120" x2="56" y2="129" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5"/>
                  <text x="75" y="128" textAnchor="middle" fontSize="6" fill="#4ade80" fontFamily="sans-serif">↔️ Mover</text>
                  {/* bottom sheet */}
                  <rect x="0" y="138" width="105" height="47" rx="7" fill="#1e293b" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
                  <rect x="43" y="142" width="19" height="2" rx="1" fill="rgba(255,255,255,0.18)"/>
                  <text x="52" y="153" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.35)" fontFamily="sans-serif">Mover a:</text>
                  <rect x="8" y="157" width="89" height="9" rx="3.5" fill="rgba(99,102,241,0.18)" stroke="rgba(99,102,241,0.35)" strokeWidth="0.5"/>
                  <text x="52" y="164" textAnchor="middle" fontSize="6" fill="#818cf8" fontFamily="sans-serif">📍 En Progreso (actual)</text>
                  <rect x="8" y="170" width="89" height="9" rx="3.5" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5"/>
                  <text x="52" y="177" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.4)" fontFamily="sans-serif">Completado → 2 hojas</text>
                  <text x="52" y="200" textAnchor="middle" fontSize="8" fill="#4ade80" fontFamily="sans-serif">Tablero</text>
                </g>

                {/* Bonsai */}
                <g transform="translate(432, 5)">
                  <text x="94" y="14" textAnchor="middle" fontSize="8" fill="#4ade80" fontWeight="500" fontFamily="sans-serif">Responsive Design v4.0</text>
                  <line x1="94" y1="185" x2="94" y2="120" stroke="#639922" strokeWidth="2.5"/>
                  <line x1="94" y1="155" x2="60" y2="105" stroke="#639922" strokeWidth="1.5"/>
                  <line x1="94" y1="138" x2="128" y2="98" stroke="#639922" strokeWidth="1.5"/>
                  <line x1="94" y1="120" x2="72" y2="75" stroke="#639922" strokeWidth="1"/>
                  <line x1="94" y1="120" x2="116" y2="70" stroke="#639922" strokeWidth="1"/>
                  <circle cx="60" cy="97" r="14" fill="rgba(99,153,34,0.12)" stroke="rgba(99,153,34,0.4)" strokeWidth="0.5"/>
                  <text x="60" y="94" textAnchor="middle" fontSize="6" fill="#3B6D11" fontFamily="sans-serif">Sprint 0</text>
                  <text x="60" y="103" textAnchor="middle" fontSize="5.5" fill="#639922" fontFamily="sans-serif">Entorno</text>
                  <circle cx="128" cy="90" r="14" fill="rgba(99,153,34,0.12)" stroke="rgba(99,153,34,0.4)" strokeWidth="0.5"/>
                  <text x="128" y="87" textAnchor="middle" fontSize="6" fill="#3B6D11" fontFamily="sans-serif">Sprint 1</text>
                  <text x="128" y="96" textAnchor="middle" fontSize="5.5" fill="#639922" fontFamily="sans-serif">Landing</text>
                  <circle cx="72" cy="66" r="14" fill="rgba(99,153,34,0.18)" stroke="#4ade80" strokeWidth="0.8"/>
                  <text x="72" y="63" textAnchor="middle" fontSize="6" fill="#3B6D11" fontFamily="sans-serif">Sprint 2</text>
                  <text x="72" y="72" textAnchor="middle" fontSize="5.5" fill="#639922" fontFamily="sans-serif">Dashboard</text>
                  <circle cx="116" cy="61" r="14" fill="rgba(99,153,34,0.18)" stroke="#4ade80" strokeWidth="0.8"/>
                  <text x="116" y="58" textAnchor="middle" fontSize="6" fill="#3B6D11" fontFamily="sans-serif">Sprint 3</text>
                  <text x="116" y="67" textAnchor="middle" fontSize="5.5" fill="#639922" fontFamily="sans-serif">Tablero</text>
                  <ellipse cx="94" cy="38" rx="30" ry="20" fill="rgba(99,153,34,0.1)" stroke="rgba(99,153,34,0.3)" strokeWidth="0.5"/>
                  <text x="94" y="35" textAnchor="middle" fontSize="7" fill="#3B6D11" fontWeight="500" fontFamily="sans-serif">✓ Merged</text>
                  <text x="94" y="46" textAnchor="middle" fontSize="6" fill="#639922" fontFamily="sans-serif">main</text>
                  <rect x="74" y="185" width="40" height="12" rx="3" fill="rgba(99,153,34,0.18)" stroke="rgba(99,153,34,0.35)" strokeWidth="0.5"/>
                  <rect x="69" y="181" width="50" height="6" rx="2" fill="rgba(99,153,34,0.22)" stroke="rgba(99,153,34,0.35)" strokeWidth="0.5"/>
                </g>
              </svg>
            </div>

            {/* 4 tarjetas de mejoras */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {[
                { icon: "📱", title: "Tablero con pestañas", desc: "Las tres columnas se convierten en pestañas con conteo de hojas. Una columna a la vez, sin scroll horizontal." },
                { icon: "👆", title: "Mover con un toque", desc: "Un panel deslizable reemplaza el drag & drop. Toca \"Mover\" en cualquier hoja y elige la columna destino." },
                { icon: "🌳", title: "Bonsais y sprints adaptados", desc: "El dashboard y la vista de bonsais muestran tarjetas expandibles en lugar del layout de tres columnas." },
                { icon: "☰",  title: "Navegación colapsable", desc: "El menú hamburguesa reemplaza la barra de navegación horizontal en todas las pantallas de la app." },
              ].map((item, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5">
                  <div className="text-2xl mb-3">{item.icon}</div>
                  <p className="text-white font-medium text-sm mb-1">{item.title}</p>
                  <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Historia de cómo lo construimos */}
            <div className="border border-green-500/20 bg-green-900/10 rounded-2xl px-6 py-6">
              <p className="text-green-400 text-xs uppercase tracking-widest mb-3">Cómo lo construimos</p>
              <p className="text-white/65 text-sm leading-relaxed">
                Usamos KanbanBonsai para gestionar el desarrollo de KanbanBonsai. Creamos un Bonsai llamado{" "}
                <span className="text-white/85">"Responsive Design v4.0"</span> con cuatro sprints: preparación del entorno,
                páginas públicas, dashboard y bonsais, y tablero kanban. Cada pantalla fue una Hoja. Cada decisión de diseño,
                una subtarea marcada. La rama <span className="text-green-400 font-mono text-xs">responsive</span> vivió
                en paralelo a producción — los usuarios existentes no sintieron ninguna interrupción. Cuando todo estuvo
                aprobado en la URL de preview, un solo merge lo publicó todo.{" "}
                <span className="text-white/85">La paradoja sigue siendo la misma: usamos Kanban para construir Kanban.
                Ahora también desde el teléfono.</span>
              </p>
            </div>

          </div>
        </section>

        {/* ── Propuesta de valor ── */}
        <section className="relative z-10 border-t border-white/10 py-16 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-6">El problema que resolvemos</p>
            <blockquote className="text-2xl lg:text-3xl font-light text-white/80 leading-relaxed mb-8 italic">
              "Saber qué quieres lograr nunca fue el problema.<br/>
              El cuello de botella siempre fue el paso siguiente."
            </blockquote>
            <div className="flex items-center justify-center gap-6 flex-wrap text-sm text-white/50">
              <span>¿Cómo lo estructuro?</span>
              <span className="text-white/20">·</span>
              <span>¿Por dónde empiezo?</span>
              <span className="text-white/20">·</span>
              <span>¿Cómo lo explico al equipo?</span>
            </div>
            <div className="mt-10 inline-flex items-center gap-3 bg-purple-900/30 border border-purple-500/20 rounded-xl px-6 py-4">
              <span className="text-2xl">✨</span>
              <p className="text-purple-200 text-sm text-left leading-relaxed">
                <strong>KanbanBonsai v4.0 elimina esa barrera.</strong><br/>
                Describes tu proyecto. Claude lo estructura. Tú lo ejecutas. Desde cualquier dispositivo.
              </p>
            </div>
          </div>
        </section>

        {/* ── Funcionalidades ── */}
        <section id="funcionalidades" className="relative z-10 border-t border-white/10 py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <p className="text-green-400 text-xs uppercase tracking-widest mb-3 text-center">Funcionalidades v4.0</p>
            <h2 className="text-3xl font-bold text-white text-center mb-4">Todo lo que necesitas, nada que no</h2>
            <p className="text-white/45 text-center mb-12 max-w-lg mx-auto text-sm">
              Cada funcionalidad fue una Hoja en nuestro propio Sprint de desarrollo.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map(f => {
                const c = colorMap[f.color]
                return (
                  <button key={f.title} onClick={() => setActiveFeature(f)}
                    className={`text-left p-5 rounded-xl border ${c.bg} ${c.border} hover:border-opacity-60 transition-all group`}>
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl">{f.icon}</span>
                      <div className="flex gap-1.5">
                        {f.isNew && <span className="text-xs bg-purple-800/60 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full">Nuevo</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${c.badge}`}>{f.badge}</span>
                      </div>
                    </div>
                    <h3 className={`font-bold text-base mb-2 ${c.text}`}>{f.title}</h3>
                    <p className="text-white/55 text-sm leading-relaxed">{f.desc}</p>
                    <p className={`mt-3 text-xs ${c.text} opacity-0 group-hover:opacity-100 transition-opacity`}>Ver detalles →</p>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── Jerarquía visual ── */}
        <section className="relative z-10 border-t border-white/10 py-16 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-8">La jerarquía de KanbanBonsai</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {[
                { emoji:"🌳", label:"Bonsai",   sub:"Proyecto" },
                null,
                { emoji:"🌿", label:"Sprint",   sub:"Etapa" },
                null,
                { emoji:"🍃", label:"Hoja",     sub:"Tarea" },
                null,
                { emoji:"✓",  label:"Subtarea", sub:"Acción" },
              ].map((item, i) =>
                item === null
                  ? <span key={i} className="text-white/20 text-xl">→</span>
                  : <div key={i} className="bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-center min-w-[80px]">
                      <div className="text-2xl mb-1">{item.emoji}</div>
                      <div className="text-white font-semibold text-xs">{item.label}</div>
                      <div className="text-white/40 text-xs mt-0.5">{item.sub}</div>
                    </div>
              )}
            </div>
            <p className="mt-8 text-white/40 text-sm max-w-md mx-auto leading-relaxed">
              Cada nivel tiene su propósito. El Agente IA genera la estructura completa desde arriba.
              Tú la ejecutas desde abajo.
            </p>
          </div>
        </section>

        {/* ── Estadísticas ── */}
        {stats && (
          <section id="stats" className="relative z-10 border-t border-white/10 py-16 px-6">
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

        {/* ── Historia ── */}
        <section id="historia" className="relative z-10 border-t border-white/10 py-20 px-6">
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
                 :s.color==="purple" ? "bg-purple-800/60 border-purple-500/30 text-purple-400"
                 :s.color==="indigo" ? "bg-indigo-800/60 border-indigo-500/30 text-indigo-400"
                 : "bg-gray-800/60 border-gray-500/30 text-gray-400"
                return (
                  <div key={s.num} className="flex gap-5">
                    <div className={`flex-shrink-0 w-9 h-9 rounded-full border flex items-center justify-center text-sm font-bold ${badge}`}>
                      {s.num}
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-1">{s.title}</h3>
                      <p className="text-sm">{s.text}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── CTA final ── */}
        <section className="relative z-10 border-t border-white/10 py-20 px-6 text-center">
          <div className="max-w-lg mx-auto">
            <p className="text-4xl mb-6">🌳</p>
            <h2 className="text-3xl font-bold text-white mb-4">¿Listo para empezar?</h2>
            <p className="text-white/50 mb-8 text-sm leading-relaxed">
              Gratis. Sin tarjeta de crédito. Tu primer Bonsai en menos de 2 minutos.
            </p>
            <Link href="/register"
              className="inline-block bg-green-600 hover:bg-green-500 text-white font-semibold px-10 py-4 rounded-xl transition-colors text-base shadow-lg shadow-green-900/30">
              Crear cuenta gratis →
            </Link>
          </div>
        </section>

      </div>

      {/* ── Footer ── */}
      <footer className="relative z-20 border-t border-white/10" style={{ background: APP_BG }}>
        <div className="max-w-5xl mx-auto px-6 py-5 text-center">
          <p className="text-xs text-white/25">
            © 2026 kanbanbonsai · vibe-coded by{" "}
            <a href="https://umbusk.com" target="_blank" rel="noopener noreferrer"
               className="text-white/40 hover:text-white/60">Umbusk</a>
            {" "}y Claude de Anthropic
          </p>
        </div>
      </footer>

    </div>
  )
}
