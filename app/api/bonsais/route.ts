import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const bonsais = await prisma.bonsai.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        sprints: {
          orderBy: { createdAt: "asc" },
          include: {
            columns: {
              orderBy: { position: "asc" },
              include: { _count: { select: { cards: true } } },
            },
          },
        },
      },
    })

    const result = bonsais.map((bonsai) => ({
      id:            bonsai.id,
      name:          bonsai.name,
      description:   bonsai.description,
      createdAt:     bonsai.createdAt,
      generatedByAI: bonsai.generatedByAI,  // ← AGREGADO
      aiPrompt:      bonsai.aiPrompt,        // ← AGREGADO
      sprints: bonsai.sprints.map((board) => {
        const totalCards = board.columns.reduce((sum, col) => sum + col._count.cards, 0)
        const lastCol    = board.columns[board.columns.length - 1]
        const col3Cards  = lastCol?._count.cards ?? 0
        const inProgress = totalCards > 0 && col3Cards < totalCards
        return {
          id:            board.id,
          name:          board.name,
          description:   board.description,
          createdAt:     board.createdAt,
          generatedByAI: board.generatedByAI,  // ← AGREGADO
          aiPrompt:      board.aiPrompt,        // ← AGREGADO
          totalCards,
          col3Cards,
          inProgress,
          progress: totalCards > 0 ? Math.round((col3Cards / totalCards) * 100) : 0,
        }
      }),
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error al obtener bonsais:", error)
    return NextResponse.json({ error: "Error al obtener bonsais" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const { name, description } = await request.json()
    if (!name) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
    }
    const bonsai = await prisma.bonsai.create({
      data: {
        name,
        description: description || null,
        ownerId: session.user.id,
      },
    })
    return NextResponse.json(bonsai, { status: 201 })
  } catch (error) {
    console.error("Error al crear bonsai:", error)
    return NextResponse.json({ error: "Error al crear bonsai" }, { status: 500 })
  }
}
