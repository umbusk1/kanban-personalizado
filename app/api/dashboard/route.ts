import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const boards = await prisma.board.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          { members: { some: { userId: session.user.id } } },
        ],
      },
      include: {
        owner: true,
        _count: { select: { columns: true, members: true } },
        // ← NUEVO: incluimos columnas ordenadas por posición,
        //   con conteo de hojas en cada una
        columns: {
          orderBy: { position: 'asc' },
          select: {
            id: true,
            position: true,
            _count: { select: { cards: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const boardsWithRole = boards.map(board => {
      // ← NUEVO: clasificar si el sprint está "en proceso"
      // En proceso = sin hojas, O tiene hojas en columna 1 ó 2
      const totalCards = board.columns.reduce((sum, col) => sum + col._count.cards, 0)
      const col1and2Cards = board.columns
        .filter(col => col.position <= 2)
        .reduce((sum, col) => sum + col._count.cards, 0)

      // ← NUEVO: Hojas en la 3ra columna (completadas)
      const col3Cards = board.columns
        .filter(col => col.position === 3)
        .reduce((sum, col) => sum + col._count.cards, 0)

      const inProgress = totalCards === 0 || col1and2Cards > 0

      return {
        ...board,
        userRole: board.ownerId === session.user.id ? "owner" : "member",
        inProgress,
        totalCards,
        col3Cards,    // ← NUEVO
      }
    })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, isAdmin: true },
    })

    return NextResponse.json({ user, boards: boardsWithRole })
  } catch (error) {
    console.error("Error en dashboard:", error)
    return NextResponse.json({ error: "Error al obtener datos" }, { status: 500 })
  }
}
