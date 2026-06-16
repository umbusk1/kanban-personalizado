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

    // ── Bonsais propios ────────────────────────────────────────────────────
    const ownedBonsais = await prisma.bonsai.findMany({
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

    // ── Bonsais ajenos donde soy miembro de al menos un sprint ────────────
    // Primero obtenemos los sprints (boards) a los que pertenezco como miembro
    const memberBoards = await prisma.boardMember.findMany({
      where: { userId: session.user.id },
      select: { boardId: true },
    })
    const memberBoardIds = memberBoards.map(m => m.boardId)

    // Luego buscamos bonsais que contengan alguno de esos sprints
    // y que NO sean míos (para no duplicar)
    const sharedBonsais = memberBoardIds.length > 0
      ? await prisma.bonsai.findMany({
          where: {
            ownerId: { not: session.user.id }, // excluir los propios
            sprints: { some: { id: { in: memberBoardIds } } },
          },
          orderBy: { createdAt: "desc" },
          include: {
            owner: { select: { id: true, name: true, email: true } },
            sprints: {
              // Solo incluir los sprints a los que tengo acceso
              where: { id: { in: memberBoardIds } },
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
      : []

    // ── Función para convertir sprints al formato de respuesta ────────────
    const formatSprints = (sprints: typeof ownedBonsais[0]["sprints"]) =>
      sprints.map((board) => {
        const totalCards = board.columns.reduce((sum, col) => sum + col._count.cards, 0)
        const lastCol    = board.columns[board.columns.length - 1]
        const col3Cards  = lastCol?._count.cards ?? 0
        const inProgress = totalCards > 0 && col3Cards < totalCards
        return {
          id:            board.id,
          name:          board.name,
          description:   board.description,
          createdAt:     board.createdAt,
          generatedByAI: board.generatedByAI,
          aiPrompt:      board.aiPrompt,
          totalCards,
          col3Cards,
          inProgress,
          progress: totalCards > 0 ? Math.round((col3Cards / totalCards) * 100) : 0,
        }
      })

    // ── Construir respuesta combinada ─────────────────────────────────────
    const ownedResult = ownedBonsais.map((bonsai) => ({
      id:            bonsai.id,
      name:          bonsai.name,
      description:   bonsai.description,
      createdAt:     bonsai.createdAt,
      generatedByAI: bonsai.generatedByAI,
      aiPrompt:      bonsai.aiPrompt,
      userRole:      "owner" as const,
      owner:         null,
      sprints:       formatSprints(bonsai.sprints),
    }))

    const sharedResult = sharedBonsais.map((bonsai) => ({
      id:            bonsai.id,
      name:          bonsai.name,
      description:   bonsai.description,
      createdAt:     bonsai.createdAt,
      generatedByAI: bonsai.generatedByAI,
      aiPrompt:      bonsai.aiPrompt,
      userRole:      "member" as const,
      owner:         (bonsai as any).owner,
      sprints:       formatSprints(bonsai.sprints),
    }))

    // Propios primero, luego compartidos
    return NextResponse.json([...ownedResult, ...sharedResult])

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
