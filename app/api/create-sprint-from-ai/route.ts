import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface SprintHoja {
  title: string
  description: string | null
  position: number
  priority: string | null
}

interface SprintPayload {
  sprint: {
    name: string
    description: string | null
    hojas: SprintHoja[]
  }
}

export async function POST(request: Request) {
  try {

    // 1. Verificar sesión
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
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
      return NextResponse.json({ error: "Bonsai no encontrado" }, { status: 404 })
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
        system: `Eres el Agente Sprint de KanbanBonsai. Tu función es tomar la descripción de un sprint y convertirla en un plan de trabajo estructurado en formato JSON.

CONTEXTO:
- Un Sprint es una etapa de un proyecto con un objetivo concreto y un resultado entregable claro.
- Un Sprint se divide en Hojas de actividad: áreas de trabajo que agrupan tareas relacionadas.
- Las Hojas son tarjetas que el usuario moverá en un tablero Kanban de 3 columnas: Por Hacer → En Progreso → Completado.
- El Agente crea todas las Hojas en "Por Hacer". El usuario las mueve según avanza.

CRITERIO MECE PARA LAS HOJAS:
Aplica el Principio de la Pirámide de Minto. Las hojas deben ser:
- Mutuamente Exclusivas: ninguna hoja se solapa con otra. Si "Diseño" y "Prototipado" se solapan, fúsionalas.
- Colectivamente Exhaustivas: entre todas las hojas cubren todo lo necesario para lograr el objetivo del sprint. Si falta un área obvia, inclúyela aunque el usuario no la haya mencionado.

LÍMITES COGNITIVOS (Ley de Miller: 7 ± 2):
- Mínimo 2 hojas, ideal 5, máximo 7.
- Mínimo 2 tareas por hoja, ideal 5, máximo 9.
- Máximo 5 sub-tareas por tarea.

CRITERIOS PARA LAS HOJAS:
- Cada hoja representa un área de trabajo distinta y coherente.
- El nombre debe ser corto y orientado a la acción (ej: "Investigación", "Producción de contenido", "Configuración técnica").
- El orden (position) debe seguir una secuencia lógica de ejecución.

CRITERIOS PARA LAS TAREAS (campo description de cada hoja):
- Son sub-tareas en formato markdown: - [ ] texto de la tarea
- Deben empezar con verbo en infinitivo: "Definir", "Crear", "Revisar", "Publicar"
- Si no hay sub-tareas claras, description es null

PRIORIDADES:
- "high": hojas bloqueantes o críticas para el objetivo del sprint
- "medium": hojas importantes pero no bloqueantes
- "low": hojas opcionales o de refinamiento
- null: cuando no hay información suficiente para determinarla

IDIOMA:
- Responde siempre en el mismo idioma del brief del usuario.

REGLAS ABSOLUTAS:
- Responde ÚNICAMENTE con el JSON. Sin texto adicional, sin markdown, sin explicaciones.
- El JSON debe ser parseable directamente con JSON.parse()
- No inventes información que no esté en el brief ni pueda inferirse razonablemente
- Si el brief es vago, genera un sprint útil con lo que puedas inferir

ESTRUCTURA JSON REQUERIDA:
{
  "sprint": {
    "name": "string — nombre del sprint orientado al resultado",
    "description": "string — una oración que resume el objetivo, o null",
    "hojas": [
      {
        "title": "string — nombre del área de trabajo",
        "description": "string con sub-tareas en markdown (- [ ] tarea), o null",
        "position": 0,
        "priority": "high | medium | low | null"
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

    // 5. Parsear respuesta de Claude
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

    // 6. Validación mínima
    const { sprint } = sprintData
    if (!sprint?.name || !Array.isArray(sprint?.hojas) || sprint.hojas.length === 0) {
      return NextResponse.json(
        { error: "La estructura del sprint generado no es válida." },
        { status: 422 }
      )
    }

    // 7. Insertar en Neon — 3 columnas fijas + hojas en "Por Hacer"
    const board = await prisma.board.create({
      data: {
        name: sprint.name,
        description: sprint.description ?? null,
        ownerId: session.user.id,
        bonsaiId: bonsaiId,
        columns: {
          create: [
            {
              name: "Por Hacer",
              position: 0,
              color: "#3b82f6",
              cards: {
                create: sprint.hojas
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
            {
              name: "En Progreso",
              position: 1,
              color: "#eab308",
              wipLimit: 5,
            },
            {
              name: "Completado",
              position: 2,
              color: "#22c55e",
            },
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

    return NextResponse.json(board, { status: 201 })

  } catch (error) {
    console.error("Error en create-sprint-from-ai:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
