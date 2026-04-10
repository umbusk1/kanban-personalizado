import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const WEEKLY_BONSAI_LIMIT = 1

function getWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // lunes
  const monday = new Date(now)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

interface BonsaiHoja {
  title: string
  description: string | null
  position: number
  priority: string | null
}

interface BonsaiSprint {
  name: string
  description: string | null
  position: number
  hojas: BonsaiHoja[]
}

interface BonsaiPayload {
  bonsai: {
    name: string
    description: string | null
    sprints: BonsaiSprint[]
  }
}

export async function POST(request: Request) {
  try {

    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { freeText } = await request.json()
    if (!freeText) {
      return NextResponse.json({ error: "Se requiere freeText" }, { status: 400 })
    }

    // ── Verificar cuota semanal ───────────────────────────────────────────────
    const weekStart = getWeekStart()
    const usedThisWeek = await prisma.bonsai.count({
      where: {
        ownerId: session.user.id,
        generatedByAI: true,
        createdAt: { gte: weekStart },
      },
    })
    if (usedThisWeek >= WEEKLY_BONSAI_LIMIT) {
      return NextResponse.json(
        { error: "QUOTA_EXCEEDED", type: "bonsai", used: usedThisWeek, limit: WEEKLY_BONSAI_LIMIT },
        { status: 429 }
      )
    }

    // ── Llamar a Claude ───────────────────────────────────────────────────────
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 6000,
        system: `Eres el Agente Bonsai de KanbanBonsai. Tu función es tomar la descripción de un proyecto y convertirlo en una estructura completa de Bonsai con múltiples Sprints, siguiendo el Principio de la Pirámide de Minto.

JERARQUÍA DE KANBANBONSAI:
- Bonsai: proyecto mayor con un objetivo estratégico claro
- Sprint: etapa del proyecto con un resultado entregable concreto y verificable
- Hoja: área de trabajo dentro del sprint (tarjeta en el tablero Kanban)

CRITERIO MECE — APLICAR EN TODOS LOS NIVELES:
- Mutuamente Exclusivos: ningún Sprint se solapa con otro. Ninguna Hoja se solapa dentro del mismo Sprint.
- Colectivamente Exhaustivos: el conjunto de Sprints cubre todo lo necesario para el objetivo del Bonsai.

LÍMITES COGNITIVOS (Ley de Miller — 7 ± 2):
- Sprints por Bonsai: mínimo 2, ideal 3–5, máximo 7
- Hojas por Sprint: mínimo 2, ideal 5, máximo 7
- Sub-tareas por Hoja: máximo 5

CRITERIOS PARA LOS SPRINTS:
- Cada Sprint representa una etapa o dimensión distinta del proyecto
- Nombre orientado al resultado entregable
- El orden (position) debe seguir la secuencia lógica de ejecución

CRITERIOS PARA LAS HOJAS:
- Nombre corto y orientado a la acción
- Sub-tareas en description como markdown: - [ ] verbo + acción

IDIOMA: responde siempre en el idioma del texto del usuario.

REGLAS ABSOLUTAS:
- Responde ÚNICAMENTE con el JSON. Sin texto, sin markdown, sin explicaciones.
- El JSON debe ser parseable directamente con JSON.parse()

ESTRUCTURA JSON REQUERIDA:
{
  "bonsai": {
    "name": "string",
    "description": "string o null",
    "sprints": [
      {
        "name": "string",
        "description": "string o null",
        "position": 0,
        "hojas": [
          {
            "title": "string",
            "description": "string con sub-tareas en markdown o null",
            "position": 0,
            "priority": "high | medium | low | null"
          }
        ]
      }
    ]
  }
}`,
        messages: [{ role: "user", content: freeText }],
      }),
    })

    if (!claudeRes.ok) {
      console.error("Error de Claude API:", await claudeRes.text())
      return NextResponse.json({ error: "Error al llamar a Claude" }, { status: 502 })
    }

    let bonsaiData: BonsaiPayload
    try {
      const claudeBody = await claudeRes.json()
      const rawText: string = claudeBody.content[0].text
      const cleaned = rawText.replace(/```json|```/g, "").trim()
      bonsaiData = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: "Claude no devolvió un JSON válido. Intenta reformular el texto." },
        { status: 422 }
      )
    }

    const { bonsai } = bonsaiData
    if (!bonsai?.name || !Array.isArray(bonsai?.sprints) || bonsai.sprints.length === 0) {
      return NextResponse.json({ error: "La estructura del bonsai generado no es válida." }, { status: 422 })
    }

    // ── Crear Bonsai + Sprints en Neon ────────────────────────────────────────
    const newBonsai = await prisma.bonsai.create({
      data: {
        name: bonsai.name,
        description: bonsai.description ?? null,
        ownerId: session.user.id,
        generatedByAI: true,
        aiPrompt: freeText,
      },
    })

    const createdBoards = []
    for (const sprint of [...bonsai.sprints].sort((a, b) => a.position - b.position)) {
      const board = await prisma.board.create({
        data: {
          name: sprint.name,
          description: sprint.description ?? null,
          ownerId: session.user.id,
          bonsaiId: newBonsai.id,
          generatedByAI: true,
          aiPrompt: freeText,
          columns: {
            create: [
              {
                name: "Por Hacer",
                position: 0,
                color: "#3b82f6",
                cards: {
                  create: (sprint.hojas ?? [])
                    .sort((a, b) => a.position - b.position)
                    .map((hoja) => ({
                      title: hoja.title,
                      description: hoja.description ?? null,
                      position: hoja.position,
                      priority: hoja.priority ?? null,
                      createdBy: session.user.id,
                    })),
                },
              },
              { name: "En Progreso", position: 1, color: "#eab308", wipLimit: 5 },
              { name: "Completado",  position: 2, color: "#22c55e" },
            ],
          },
        },
        include: {
          columns: {
            orderBy: { position: "asc" },
            include: { cards: { orderBy: { position: "asc" } } },
          },
        },
      })
      createdBoards.push(board)
    }

    return NextResponse.json({ bonsai: newBonsai, boards: createdBoards }, { status: 201 })

  } catch (error) {
    console.error("Error en create-bonsai-from-ai:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
