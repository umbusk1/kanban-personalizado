// lib/lapso.ts
//
// Cálculo compartido de fechas de un Sprint a partir de sus Hojas.
// Lo usan el PDF (lib/generatePdf.ts) y el botón "Ordenar por fecha" de un Bonsai
// (app/api/bonsais/[id]/orden). Sirve tanto en el navegador como en el servidor.

type Fecha = string | Date | null | undefined
export type HojaConFechas = { startDate?: Fecha; dueDate?: Fecha }

function aTiempo(f: Fecha): number | null {
  if (!f) return null
  const t = new Date(f).getTime()
  return Number.isNaN(t) ? null : t
}

// Lapso de un Sprint: la primera fecha de inicio y la última fecha límite de sus Hojas.
// OJO: si ninguna Hoja tiene fecha de inicio, `inicio` es null. No se usa la fecha de
// creación como respaldo (a diferencia del "Lapso" que se muestra en la pantalla del
// Sprint), para poder distinguir un Sprint sin fechas de uno con fechas.
export function lapsoDeHojas(hojas: HojaConFechas[]): { inicio: number | null; fin: number | null } {
  const inicios = hojas.map((h) => aTiempo(h.startDate)).filter((t): t is number => t !== null)
  const fines   = hojas.map((h) => aTiempo(h.dueDate)).filter((t): t is number => t !== null)
  return {
    inicio: inicios.length > 0 ? Math.min(...inicios) : null,
    fin:    fines.length   > 0 ? Math.max(...fines)   : null,
  }
}

// Lapso de un conjunto de Sprints (por ejemplo, un Bonsai completo).
export function lapsoDeLapsos(lapsos: { inicio: number | null; fin: number | null }[]): { inicio: number | null; fin: number | null } {
  const inicios = lapsos.map((l) => l.inicio).filter((t): t is number => t !== null)
  const fines   = lapsos.map((l) => l.fin).filter((t): t is number => t !== null)
  return {
    inicio: inicios.length > 0 ? Math.min(...inicios) : null,
    fin:    fines.length   > 0 ? Math.max(...fines)   : null,
  }
}

// Orden cronológico de los Sprints de un Bonsai ("Ordenar por fecha").
// Recibe los sprints en su orden actual y devuelve los ids en el orden nuevo:
//  - por la primera fecha de inicio de sus hojas (si ninguna tiene inicio, por su primera fecha límite);
//  - a igualdad de fecha, se respeta el orden que ya tenían;
//  - los sprints sin ninguna fecha quedan al final, también en su orden anterior.
export function ordenarSprintsPorFecha(sprints: { id: string; hojas: HojaConFechas[] }[]): string[] {
  const claves = sprints.map((s, indice) => {
    const { inicio, fin } = lapsoDeHojas(s.hojas)
    return { id: s.id, indice, clave: inicio ?? fin }
  })
  claves.sort((a, b) => {
    if (a.clave === null && b.clave === null) return a.indice - b.indice
    if (a.clave === null) return 1
    if (b.clave === null) return -1
    return a.clave - b.clave || a.indice - b.indice
  })
  return claves.map((c) => c.id)
}

// Formato igual al de la app: "18 nov 2026".
// Las fechas se guardan a medianoche UTC: se muestran en UTC para no correr un día.
export function formatearFecha(f: Fecha | number): string {
  if (f === null || f === undefined || f === "") return ""
  const fecha = new Date(f)
  if (Number.isNaN(fecha.getTime())) return ""
  return fecha.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })
}
