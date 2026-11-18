// lib/generatePdf.ts
//
// Genera "fotos" en PDF de un Bonsai completo o de un Sprint individual,
// enteramente en el navegador (sin pasar por el servidor ni por Claude).
//
// Fechas: el PDF muestra el lapso del Sprint / del Bonsai (primera fecha de inicio
// y última fecha límite de sus hojas) y las fechas de cada Hoja que las tenga.

import jsPDF from "jspdf"
import { lapsoDeHojas, lapsoDeLapsos, formatearFecha } from "@/lib/lapso"

type Fecha = string | Date | null | undefined

export type PdfTask = { text: string; done: boolean }
export type PdfCard = { title: string; tasks: PdfTask[]; startDate?: Fecha; dueDate?: Fecha }
export type PdfSprint = { name: string; description: string | null; cards: PdfCard[] }

const MARGIN        = 15
const PAGE_HEIGHT   = 297  // A4 en mm
const USABLE_WIDTH  = 210 - MARGIN * 2
const LINE_HEIGHT   = 6

// Convierte el texto markdown de una Hoja ("- [ ] algo" / "- [x] algo")
// en una lista de tareas con su estado — misma expresión regular que ya
// usa el tablero para calcular el progreso.
function parseTasks(description: string | null): PdfTask[] {
  if (!description) return []
  return description
    .split("\n")
    .filter((line) => /^- \[[ x]\] /i.test(line))
    .map((line) => ({
      done: /^- \[x\] /i.test(line),
      text: line.replace(/^- \[[ x]\] /i, "").trim(),
    }))
}

// Convierte una Hoja (card) de KanbanBonsai al formato que espera el PDF.
// Conserva sus fechas de inicio y límite (si las tiene).
export function cardToPdfCard(card: { title: string; description: string | null; startDate?: Fecha; dueDate?: Fecha }): PdfCard {
  return { title: card.title, tasks: parseTasks(card.description), startDate: card.startDate, dueDate: card.dueDate }
}

// Texto con las fechas de una Hoja, o null si no tiene ninguna.
// (La fuente del PDF no dibuja flechas "→", por eso se usa "Del ... al ...".)
function textoFechasHoja(card: PdfCard): string | null {
  const ini = formatearFecha(card.startDate)
  const fin = formatearFecha(card.dueDate)
  if (ini && fin) return ini === fin ? `Fecha: ${ini}` : `Del ${ini} al ${fin}`
  if (fin) return `Límite: ${fin}`
  if (ini) return `Inicio: ${ini}`
  return null
}

// Texto con el lapso de un Sprint o de un Bonsai, o null si no hay ninguna fecha.
function textoLapso(lapso: { inicio: number | null; fin: number | null }): string | null {
  const ini = formatearFecha(lapso.inicio)
  const fin = formatearFecha(lapso.fin)
  if (ini && fin) return ini === fin ? `Lapso: ${ini}` : `Lapso: ${ini} a ${fin}`
  if (fin) return `Lapso: hasta ${fin}`
  if (ini) return `Lapso: desde ${ini}`
  return null
}

function checkPageBreak(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_HEIGHT - MARGIN) {
    doc.addPage()
    return MARGIN
  }
  return y
}

function printWrapped(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight = LINE_HEIGHT): number {
  const lines = doc.splitTextToSize(text, maxWidth)
  for (const line of lines) {
    y = checkPageBreak(doc, y, lineHeight)
    doc.text(line, x, y)
    y += lineHeight
  }
  return y
}

// Línea de fechas en letra más pequeña y gris; al terminar devuelve el texto a negro.
function printFechas(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, size = 9): number {
  doc.setFont("helvetica", "normal")
  doc.setFontSize(size)
  doc.setTextColor(110, 110, 110)
  y = printWrapped(doc, text, x, y, maxWidth)
  doc.setTextColor(0, 0, 0)
  return y
}

function printCards(doc: jsPDF, cards: PdfCard[], y: number): number {
  if (cards.length === 0) {
    doc.setFont("helvetica", "italic")
    doc.setFontSize(10)
    y = checkPageBreak(doc, y, LINE_HEIGHT)
    doc.text("Sin hojas.", MARGIN + 4, y)
    return y + LINE_HEIGHT + 2
  }
  for (const card of cards) {
    const fechas = textoFechasHoja(card)
    // El título, su línea de fechas y la primera tarea se mantienen juntos en la misma página
    y = checkPageBreak(doc, y, LINE_HEIGHT * (fechas ? 3 : 2))
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    y = printWrapped(doc, `• ${card.title}`, MARGIN + 4, y, USABLE_WIDTH - 4)

    if (fechas) {
      y = printFechas(doc, fechas, MARGIN + 10, y, USABLE_WIDTH - 10)
    }

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    if (card.tasks.length === 0) {
      y = checkPageBreak(doc, y, LINE_HEIGHT)
      doc.text("(sin tareas)", MARGIN + 10, y)
      y += LINE_HEIGHT
    } else {
      for (const task of card.tasks) {
        const mark = task.done ? "[X]" : "[ ]"
        y = printWrapped(doc, `${mark} ${task.text}`, MARGIN + 10, y, USABLE_WIDTH - 10)
      }
    }
    y += 2
  }
  return y
}

function printSprintHeader(doc: jsPDF, name: string, description: string | null, lapso: string | null, y: number): number {
  y = checkPageBreak(doc, y, LINE_HEIGHT * (lapso ? 3 : 2))
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  y = printWrapped(doc, name, MARGIN, y, USABLE_WIDTH)
  if (description) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    y = printWrapped(doc, description, MARGIN, y, USABLE_WIDTH)
  }
  if (lapso) {
    y = printFechas(doc, lapso, MARGIN, y, USABLE_WIDTH, 10)
  }
  return y + 3
}

// PDF de un solo Sprint: nombre, descripción, lapso, y cada Hoja con sus fechas y tareas.
export function generateSprintPdf(sprint: { name: string; description: string | null; cards: PdfCard[] }) {
  const doc = new jsPDF()
  let y = MARGIN

  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)
  y = printWrapped(doc, sprint.name, MARGIN, y, USABLE_WIDTH, 8)
  if (sprint.description) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    y = printWrapped(doc, sprint.description, MARGIN, y, USABLE_WIDTH)
  }
  const lapso = textoLapso(lapsoDeHojas(sprint.cards))
  if (lapso) {
    y = printFechas(doc, lapso, MARGIN, y, USABLE_WIDTH, 11)
  }
  y += 4

  y = printCards(doc, sprint.cards, y)

  doc.save(`${sprint.name}.pdf`)
}

// PDF de un Bonsai completo: nombre, descripción, lapso total, y cada Sprint
// (con su propio lapso) con sus Hojas, fechas y tareas.
export function generateBonsaiPdf(bonsai: { name: string; description: string | null }, sprints: PdfSprint[]) {
  const doc = new jsPDF()
  let y = MARGIN

  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  y = printWrapped(doc, bonsai.name, MARGIN, y, USABLE_WIDTH, 9)
  if (bonsai.description) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    y = printWrapped(doc, bonsai.description, MARGIN, y, USABLE_WIDTH)
  }
  const lapsosSprints = sprints.map((s) => lapsoDeHojas(s.cards))
  const lapsoBonsai = textoLapso(lapsoDeLapsos(lapsosSprints))
  if (lapsoBonsai) {
    y = printFechas(doc, lapsoBonsai, MARGIN, y, USABLE_WIDTH, 11)
  }
  y += 6

  sprints.forEach((sprint, i) => {
    y = printSprintHeader(doc, sprint.name, sprint.description, textoLapso(lapsosSprints[i]), y)
    y = printCards(doc, sprint.cards, y)
    y += 4
  })

  doc.save(`${bonsai.name}.pdf`)
}
