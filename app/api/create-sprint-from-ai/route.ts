import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ── Tipos para el JSON que devuelve Claude ────────────────────────────────────
interface SprintCard {
  title: string
  description: string | null
  position: number
  priority: string | null
}

interface SprintColumn {
  name: string
  position: number
  color: string | null
  cards: SprintCard[]
}

interface SprintPayload {
  sprint: {
    name: string
    description: string | null
    columns: SprintColumn[]
  }
}

// ── Endpoint principal ────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {

    // 1. Verificar sesión
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    // 2. Leer body
    const { freeText, bonsaiId } = await request.json()

    if (!freeText || !bonsaiId) {
      return NextResponse.json(
        { error: "Se requieren freeText y bonsaiId" },
        { status: 400 }
      )
    }

    // 3. Verificar que el bonsai pertenece al usuario
    const bonsai = await prisma.bonsai.findFirst({
      where: { id: bonsaiId, ownerId: session.user.id },
    })
    if (!bonsai) {
      return NextResponse.json(
        { error: "Bonsai no encontrado" },
        { status: 404 }
      )
    }

    // 4. Llamar a Claude
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: `Eres un asistente experto en gestión de proyectos. Tu única tarea es analizar el texto del usuario y devolver un JSON estructurado que represente un sprint de trabajo.

REGLAS ESTRICTAS:
- Responde ÚNICAMENTE con el JSON. Sin explicaciones, sin markdown, sin bloques de código.
- El JSON debe ser válido y parseable directamente.
- Infiere nombres significativos para el sprint y las columnas a partir del contenido.
- Agrupa las tareas en columnas temáticas (máximo 6, mínimo 1).
- Cada columna debe tener entre 2 y 8 tarjetas.
- Si hay subtareas, ponlas en description como markdown con checkboxes (- [ ] subtarea).
- Si no hay subtareas, description debe ser null.
- priority acepta solo: "high", "medium", "low", o null.

ESTRUCTURA JSON REQUERIDA:
{
  "sprint": {
    "name": "string",
    "description": "string o null",
    "columns": [
      {
        "name": "string",
        "position": 0,
        "color": null,
        "cards": [
          {
            "title": "string",
            "description": "string con markdown o null",
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
      return NextResponse.json(
        { error: "Error al llamar a Claude" },
        { status: 502 }
      )
    }

    // 5. Parsear la respuesta de Claude
    let sprintData: SprintPayload
    try {
      const claudeBody = await claudeRes.json()
      const rawText: string = claudeBody.content[0].text
      const cleaned = rawText.replace(/```json|```/g, "").trim()
      sprintData = JSON.parse(cleaned)
    } catch {
      return NextResponse.json(
        { error: "Claude no devolvió un JSON válido. Intenta reformular el texto." },
        { status: 422 }
      )
    }

    // 6. Validación mínima del JSON
    const { sprint } = sprintData
    if (!sprint?.name || !Array.isArray(sprint?.columns) || sprint.columns.length === 0) {
      return NextResponse.json(
        { error: "La estructura del sprint generado no es válida." },
        { status: 422 }
      )
    }

    // 7. Insertar en Neon con nested create (atómico por defecto en Prisma)
    const board = await prisma.board.create({
      data: {
        name: sprint.name,
        description: sprint.description ?? null,
        ownerId: session.user.id,
        bonsaiId: bonsaiId,
        columns: {
          create: sprint.columns
            .sort((a, b) => a.position - b.position)
            .map((col) => ({
              name: col.name,
              position: col.position,
              color: col.color ?? null,
              cards: {
                create: (col.cards ?? [])
                  .sort((a, b) => a.position - b.position)
                  .map((card) => ({
                    title: card.title,
                    description: card.description ?? null,
                    position: card.position,
                    priority: card.priority ?? null,
                    createdBy: session.user.id,
                  })),
              },
            })),
        },
      },
      include: {
        columns: {
          orderBy: { position: "asc" },
          include: {
            cards: { orderBy: { position: "asc" } },
          },
        },
      },
    })

    return NextResponse.json(board, { status: 201 })

  } catch (error) {
    console.error("Error en create-sprint-from-ai:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
