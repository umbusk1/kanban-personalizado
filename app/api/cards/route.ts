import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendCardAssignedEmail } from "@/lib/email"  // ← NUEVO

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
      orderBy: { position: "desc" },
      select: { position: true },
    })

    const newPosition = maxPosition ? maxPosition.position + 1 : 1

    // Crear la hoja
    const card = await prisma.card.create({
      data: {
        columnId,
        title,
        description: description || null,
        priority:    priority    || null,
        assignedTo:  assignedTo  || null,
        createdBy:   session.user.id,
        position:    newPosition,
      },
      include: {
        assignee: true,
      },
    })

    // ← NUEVO: email al asignado si es distinto al creador
    if (card.assignee && card.assignee.id !== session.user.id) {
      try {
        await sendCardAssignedEmail({
          to:             card.assignee.email,
          assigneeName:   card.assignee.name  || card.assignee.email,
          cardTitle:      card.title,
          boardName:      column.board.name,
          assignedByName: session.user.name   || session.user.email || "Un compañero",
        })
      } catch (emailError) {
        // El email falló, pero la hoja ya se creó → solo registramos el error
        console.error("Error enviando email de asignación:", emailError)
      }
    }

    return NextResponse.json(card, { status: 201 })

  } catch (error) {
    console.error("Error al crear hoja:", error)
    return NextResponse.json(
      { error: "Error al crear hoja" },
      { status: 500 }
    )
  }
}
