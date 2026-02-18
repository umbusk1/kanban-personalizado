import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const board = await prisma.board.findUnique({
      where: { id: params.id },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            cards: {
              orderBy: { position: 'asc' },
              include: {
                assignee: true,
              },
            },
          },
        },
        owner: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    })

    if (!board) {
      return NextResponse.json(
        { error: "Tablero no encontrado" },
        { status: 404 }
      )
    }

    // Verificar acceso
    const hasAccess = 
      board.ownerId === session.user.id ||
      board.members.some(m => m.userId === session.user.id)

    if (!hasAccess) {
      return NextResponse.json(
        { error: "No tienes acceso" },
        { status: 403 }
      )
    }

    return NextResponse.json(board)
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      { error: "Error al obtener tablero" },
      { status: 500 }
    )
  }
}
