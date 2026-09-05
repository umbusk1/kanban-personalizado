// lib/generatePdf.ts
//
// Genera "fotos" en PDF de un Bonsai completo o de un Sprint individual,
// enteramente en el navegador (sin pasar por el servidor ni por Claude).

import jsPDF from "jspdf"

export type PdfTask = { text: string; done: boolean }
export type PdfCard = { title: string; tasks: PdfTask[] }
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
export function cardToPdfCard(card: { title: string; description: string | null }): PdfCard {
  return { title: card.title, tasks: parseTasks(card.description) }
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

function printCards(doc: jsPDF, cards: PdfCard[], y: number): number {
  if (cards.length === 0) {
    doc.setFont("helvetica", "italic")
    doc.setFontSize(10)
    y = checkPageBreak(doc, y, LINE_HEIGHT)
    doc.text("Sin hojas.", MARGIN + 4, y)
    return y + LINE_HEIGHT + 2
  }
  for (const card of cards) {
    y = checkPageBreak(doc, y, LINE_HEIGHT * 2)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    y = printWrapped(doc, `• ${card.title}`, MARGIN + 4, y, USABLE_WIDTH - 4)

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

function printSprintHeader(doc: jsPDF, name: string, description: string | null, y: number): number {
  y = checkPageBreak(doc, y, LINE_HEIGHT * 2)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  y = printWrapped(doc, name, MARGIN, y, USABLE_WIDTH)
  if (description) {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    y = printWrapped(doc, description, MARGIN, y, USABLE_WIDTH)
  }
  return y + 3
}

// PDF de un solo Sprint: nombre, descripción, y cada Hoja con sus tareas.
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
  y += 4

  y = printCards(doc, sprint.cards, y)

  doc.save(`${sprint.name}.pdf`)
}

// PDF de un Bonsai completo: nombre, descripción, y cada Sprint con sus Hojas y tareas.
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
  y += 6

  for (const sprint of sprints) {
    y = printSprintHeader(doc, sprint.name, sprint.description, y)
    y = printCards(doc, sprint.cards, y)
    y += 4
  }

  doc.save(`${bonsai.name}.pdf`)
}
