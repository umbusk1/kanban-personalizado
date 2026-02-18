import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH - Editar tarjeta
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

    const { title, description, priority, assignedTo } = await request.json()

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

    // Actualizar tarjeta
    const updatedCard = await prisma.card.update({
      where: { id: params.id },
      data: {
        title: title ?? card.title,
        description: description !== undefined ? description : card.description,
        priority: priority !== undefined ? priority : card.priority,
        assignedTo: assignedTo !== undefined ? assignedTo : card.assignedTo,
      },
      include: {
        assignee: true,
      },
    })

    return NextResponse.json(updatedCard)
  } catch (error) {
    console.error("Error al actualizar tarjeta:", error)
    return NextResponse.json(
      { error: "Error al actualizar tarjeta" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar tarjeta
export async function DELETE(
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

    // Eliminar tarjeta
    await prisma.card.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al eliminar tarjeta:", error)
    return NextResponse.json(
      { error: "Error al eliminar tarjeta" },
      { status: 500 }
    )
  }
}
