// Exportación a calendario (.ics, RFC 5545) — nov 2026
// Cada Hoja con fechas se vuelve una actividad desde su inicio hasta su fin. La lee cualquier
// calendario: YouRadar, Google, Apple, Outlook.
// Las Hojas no tienen hora, así que se les asigna una: las que empiezan el mismo día se reparten
// cada 3 horas desde las 8:00 (8, 11, 14, 17); si son más de 4, se aprietan entre las 8:00 y las 18:00.
// La hora es "flotante" (sin zona): 8:00 en el lugar donde se mire el calendario.

type HojaIcs = {
  id: string
  title: string
  description: string | null
  startDate: Date | null
  dueDate: Date | null
  columnName: string
  sprintName: string
  createdAt?: Date
}

const CRLF = "\r\n"
const pad = (n: number) => String(n).padStart(2, "0")
const dia = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
const ahoraUtc = () => {
  const d = new Date()
  return `${dia(d)}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}
const DIA_MS = 86400000
// Hora flotante (sin Z ni zona): día de la fecha (guardada a medianoche UTC) + minutos desde la medianoche
const conHora = (d: Date, min: number) => {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + min * 60000)
  return `${dia(t)}T${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}00`
}
// Minuto del día para la posición i de n Hojas que empiezan el mismo día
export function minutoDelTurno(i: number, n: number): number {
  const paso = n <= 4 ? 180 : Math.floor(600 / (n - 1) / 15) * 15
  return 8 * 60 + i * paso
}
const escapar = (t: string) =>
  t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")

// Las líneas de más de 75 bytes se doblan (continúan en la siguiente con un espacio)
function doblar(linea: string): string {
  const bytes = new TextEncoder()
  if (bytes.encode(linea).length <= 75) return linea
  const partes: string[] = []
  let actual = ""
  for (const ch of linea) {
    if (bytes.encode(actual + ch).length > (partes.length ? 74 : 75)) { partes.push(actual); actual = "" }
    actual += ch
  }
  partes.push(actual)
  return partes.join(CRLF + " ")
}

export function generarIcs(nombreCalendario: string, hojas: HojaIcs[], urlBase: string): { ics: string; conFecha: number } {
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//KanbanBonsai//Exportar a calendario//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:" + escapar(nombreCalendario),
  ]
  const sello = ahoraUtc()
  const conFechas = hojas.filter((h) => h.startDate || h.dueDate)
  // Turnos del día: las Hojas que empiezan el mismo día, en el orden en que se crearon
  // (así una Hoja nueva se suma al final y no le mueve la hora a las demás, mientras sean 4 o menos)
  const porDia = new Map<string, HojaIcs[]>()
  for (const h of conFechas) {
    const k = dia((h.startDate || h.dueDate)!)
    porDia.set(k, [...(porDia.get(k) || []), h])
  }
  const minuto = new Map<string, number>()
  porDia.forEach((grupo) => {
    grupo.sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0) || a.id.localeCompare(b.id))
    grupo.forEach((h, i) => minuto.set(h.id, minutoDelTurno(i, grupo.length)))
  })
  let conFecha = 0
  for (const h of conFechas) {
    const inicio = (h.startDate || h.dueDate)!
    let fin = (h.dueDate || h.startDate)!
    if (fin.getTime() < inicio.getTime()) fin = inicio
    conFecha++
    const min = minuto.get(h.id) ?? 8 * 60
    // Dura 1 hora; si la Hoja abarca varios días, termina el último día a la misma hora + 1 h
    const finMin = Math.round((fin.getTime() - inicio.getTime()) / DIA_MS) * 24 * 60 + min + 60
    const hecho = /complet|hecho|done/i.test(h.columnName)
    const notas = [
      `Sprint: ${h.sprintName} · Estado: ${h.columnName}`,
      h.description?.trim() || "",
      urlBase,
    ].filter(Boolean).join("\n\n")
    lineas.push(
      "BEGIN:VEVENT",
      `UID:hoja-${h.id}@kanbanbonsai`,
      `DTSTAMP:${sello}`,
      `DTSTART:${conHora(inicio, min)}`,
      `DTEND:${conHora(inicio, finMin)}`,
      "SUMMARY:" + escapar((hecho ? "✓ " : "") + h.title),
      "DESCRIPTION:" + escapar(notas),
      "CATEGORIES:" + escapar(h.sprintName),
      "TRANSP:TRANSPARENT",
      "STATUS:CONFIRMED",
      "END:VEVENT",
    )
  }
  lineas.push("END:VCALENDAR")
  return { ics: lineas.map(doblar).join(CRLF) + CRLF, conFecha }
}

export function nombreArchivo(nombre: string): string {
  const base = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()
  return (base || "kanbanbonsai").slice(0, 60) + ".ics"
}
