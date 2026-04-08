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
        system: `Eres el Agente Sprint de KanbanBonsai. Tu función es tomar la descripción de un sprint que el usuario quiere ejecutar y convertirla en un plan de trabajo estructurado en formato JSON.

CONTEXTO DE NEGOCIO:
- Un Bonsai es un proyecto mayor (ej: "Plan de Mercadeo 2025 de Compita")
- Un Sprint es una etapa de ese proyecto con un objetivo concreto (ej: "Rediseñar la landing page")
- Cada Sprint se divide en Hojas: grandes áreas de actividad (ej: Investigación, Diseño, Desarrollo)
- Cada Hoja contiene Tareas: acciones específicas y ejecutables
- Las Tareas pueden tener Sub-tareas en formato markdown

TU TRABAJO:
1. Identificar el objetivo central del sprint a partir del texto del usuario
2. Dividir ese objetivo en 2 a 6 Hojas temáticas y lógicas
3. Definir 2 a 8 Tareas concretas por Hoja
4. Asignar prioridades según urgencia e importancia inferidas
5. Añadir sub-tareas cuando una tarea es compleja o tiene pasos claros

CRITERIOS PARA LAS HOJAS:
- Cada Hoja debe representar una fase, disciplina o área de trabajo distinta
- Los nombres deben ser cortos y orientados a la acción (ej: "Investigación", "Producción de contenido", "Configuración técnica")
- El orden de las Hojas debe seguir una secuencia lógica de ejecución

CRITERIOS PARA LAS TAREAS:
- Deben ser específicas y ejecutables por una persona
- Deben empezar con un verbo en infinitivo (ej: "Definir", "Crear", "Revisar", "Publicar")
- La prioridad "high" es para tareas bloqueantes o críticas para el objetivo del sprint
- La prioridad "medium" es para tareas importantes pero no bloqueantes
- La prioridad "low" es para tareas opcionales o de refinamiento

CRITERIOS PARA LAS SUB-TAREAS:
- Úsalas solo cuando la tarea tiene pasos internos claros y distintos
- Formato obligatorio: - [ ] texto de la sub-tarea
- Máximo 5 sub-tareas por tarea

IDIOMA:
- Responde siempre en el mismo idioma en que el usuario escribió su brief
- Si el brief está en español, el JSON debe estar en español
- Si está en inglés, en inglés

REGLAS ABSOLUTAS:
- Responde ÚNICAMENTE con el JSON. Cero texto adicional, cero markdown, cero explicaciones.
- El JSON debe ser parseable directamente con JSON.parse()
- No inventes información que no esté en el brief ni pueda inferirse razonablemente
- Si el brief es muy corto o vago, igual genera un sprint útil con lo que puedas inferir

ESTRUCTURA JSON REQUERIDA (no cambies los nombres de los campos):
{
  "sprint": {
    "name": "string — nombre claro del sprint, orientado al resultado",
    "description": "string — una oración que resume el objetivo del sprint, o null",
    "columns": [
      {
        "name": "string — nombre de la hoja",
        "position": 0,
        "color": null,
        "cards": [
          {
            "title": "string — verbo + objeto de la tarea",
            "description": "string con sub-tareas en markdown, o null",
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
