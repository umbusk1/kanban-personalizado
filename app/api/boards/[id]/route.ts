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
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
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
                creator:  true, // ← NUEVO: quién creó la tarjeta
              },
            },
          },
        },
        owner: true,
        members: { include: { user: true } },
      },
    })

    if (!board) {
      return NextResponse.json({ error: "Sprint no encontrado" }, { status: 404 })
    }

    const hasAccess =
      board.ownerId === session.user.id ||
      board.members.some(m => m.userId === session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: "No tienes acceso" }, { status: 403 })
    }

    return NextResponse.json(board)
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ error: "Error al obtener sprint" }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const board = await prisma.board.findUnique({ where: { id: params.id } })
    if (!board) {
      return NextResponse.json({ error: "Sprint no encontrado" }, { status: 404 })
    }

    // Solo el dueño puede editar
    if (board.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Solo el dueño puede editar el sprint" }, { status: 403 })
    }

    // ← ACTUALIZADO: recibimos insights además de name y description
    const { name, description, insights } = await request.json()

    if (!name) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
    }

    const updated = await prisma.board.update({
      where: { id: params.id },
      data: {
        name,
        description: description !== undefined ? description : board.description,
        insights:    insights    !== undefined ? insights    : board.insights, // ← NUEVO
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error al editar sprint:", error)
    return NextResponse.json({ error: "Error al editar sprint" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const board = await prisma.board.findUnique({ where: { id: params.id } })
    if (!board) {
      return NextResponse.json({ error: "Sprint no encontrado" }, { status: 404 })
    }

    // Solo el dueño puede eliminar
    if (board.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Solo el dueño puede eliminar el sprint" }, { status: 403 })
    }

    await prisma.board.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al eliminar sprint:", error)
    return NextResponse.json({ error: "Error al eliminar sprint" }, { status: 500 })
  }
}
