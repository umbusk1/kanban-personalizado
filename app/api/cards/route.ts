import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { columnId, title, description, priority, assignedTo } = await request.json()

    if (!columnId || !title) {
      return NextResponse.json(
        { error: "Columna y título son requeridos" },
        { status: 400 }
      )
    }

    // Verificar que el usuario tiene acceso a este tablero
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: {
        board: {
          include: {
            members: true,
          },
        },
      },
    })

    if (!column) {
      return NextResponse.json(
        { error: "Columna no encontrada" },
        { status: 404 }
      )
    }

    const hasAccess = 
      column.board.ownerId === session.user.id ||
      column.board.members.some(m => m.userId === session.user.id)

    if (!hasAccess) {
      return NextResponse.json(
        { error: "No tienes acceso a este tablero" },
        { status: 403 }
      )
    }

    // Obtener la siguiente posición
    const maxPosition = await prisma.card.findFirst({
      where: { columnId },
      orderBy: { position: 'desc' },
      select: { position: true },
    })

    const newPosition = maxPosition ? maxPosition.position + 1 : 1

    // Crear la tarjeta
    const card = await prisma.card.create({
      data: {
        columnId,
        title,
        description: description || null,
        priority: priority || null,
        assignedTo: assignedTo || null,
        createdBy: session.user.id,
        position: newPosition,
      },
      include: {
        assignee: true,
      },
    })

    return NextResponse.json(card, { status: 201 })
  } catch (error) {
    console.error("Error al crear tarjeta:", error)
    return NextResponse.json(
      { error: "Error al crear tarjeta" },
      { status: 500 }
    )
  }
}
