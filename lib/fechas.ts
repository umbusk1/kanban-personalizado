// Fechas de las Hojas (nov 2026)
// Las fechas son "de calendario" (sin hora): se guardan a medianoche UTC.

const ISO_DIA = /^\d{4}-\d{2}-\d{2}$/

/** Convierte "AAAA-MM-DD" en Date a medianoche UTC; cualquier otra cosa → null. */
export function aFecha(valor: unknown): Date | null {
  if (typeof valor !== "string" || !ISO_DIA.test(valor.trim())) return null
  const d = new Date(valor.trim() + "T00:00:00Z")
  return isNaN(d.getTime()) ? null : d
}

/** Si el inicio queda después del fin, se intercambian. */
export function ordenarFechas(inicio: Date | null, fin: Date | null): [Date | null, Date | null] {
  if (inicio && fin && inicio > fin) return [fin, inicio]
  return [inicio, fin]
}

/** Texto para el prompt de los agentes: hoy en hora de Caracas/Santo Domingo. */
export function hoyParaPrompt(): string {
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
  const dia = new Intl.DateTimeFormat("es-ES", { timeZone: "America/Caracas", weekday: "long" }).format(new Date())
  return `${hoy} (${dia})`
}

export const REGLAS_FECHAS = `
FECHAS DE LAS HOJAS:
- Cada Hoja lleva "startDate" y "dueDate" con formato "AAAA-MM-DD" (fecha de inicio y fecha de fin).
- Si el texto del usuario indica fechas, plazos o un calendario, respétalos.
- Si no los indica, propón fechas realistas a partir de la fecha de hoy, en días hábiles (lunes a viernes),
  siguiendo el orden lógico de ejecución.
- Si el usuario pide expresamente no poner fechas, usa null en ambos campos.`
