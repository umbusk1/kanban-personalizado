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
      },
      orderBy: { createdAt: "desc" },
    })

    const boardsWithRole = boards.map(board => ({
      ...board,
      userRole: board.ownerId === session.user.id ? "owner" : "member",
    }))

    // Incluir isAdmin en el usuario
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
