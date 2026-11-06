// Exportación a calendario (.ics, RFC 5545) — nov 2026
// Cada Hoja con fechas se vuelve una actividad de día completo, desde su inicio
// hasta su fin. La lee cualquier calendario: YouRadar, Google, Apple, Outlook.

type HojaIcs = {
  id: string
  title: string
  description: string | null
  startDate: Date | null
  dueDate: Date | null
  columnName: string
  sprintName: string
}

const CRLF = "\r\n"
const pad = (n: number) => String(n).padStart(2, "0")
const dia = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
const ahoraUtc = () => {
  const d = new Date()
  return `${dia(d)}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}
const escapar = (t: string) =>
  t.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")

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
  let conFecha = 0
  for (const h of hojas) {
    const inicio = h.startDate || h.dueDate
    const fin = h.dueDate || h.startDate
    if (!inicio || !fin) continue
    conFecha++
    // En .ics el fin de una actividad de día completo es el día siguiente al último
    const finExclusivo = new Date(fin.getTime() + 86400000)
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
      `DTSTART;VALUE=DATE:${dia(inicio)}`,
      `DTEND;VALUE=DATE:${dia(finExclusivo)}`,
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
