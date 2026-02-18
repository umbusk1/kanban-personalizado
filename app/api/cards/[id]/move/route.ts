import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
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

    const { columnId, position } = await request.json()

    if (!columnId) {
      return NextResponse.json(
        { error: "Columna es requerida" },
        { status: 400 }
      )
    }

    // Verificar que la tarjeta existe y el usuario tiene acceso
    const card = await prisma.card.findUnique({
      where: { id: params.id },
      include: {
        column: {
          include: {
            board: {
              include: {
                members: true,
              },
            },
          },
        },
      },
    })

    if (!card) {
      return NextResponse.json(
        { error: "Tarjeta no encontrada" },
        { status: 404 }
      )
    }

    const hasAccess = 
      card.column.board.ownerId === session.user.id ||
      card.column.board.members.some(m => m.userId === session.user.id)

    if (!hasAccess) {
      return NextResponse.json(
        { error: "No tienes acceso" },
        { status: 403 }
      )
    }

    // Mover la tarjeta
    const updatedCard = await prisma.card.update({
      where: { id: params.id },
      data: {
        columnId,
        position: position ?? card.position,
      },
      include: {
        assignee: true,
      },
    })

    return NextResponse.json(updatedCard)
  } catch (error) {
    console.error("Error al mover tarjeta:", error)
    return NextResponse.json(
      { error: "Error al mover tarjeta" },
      { status: 500 }
    )
  }
}
