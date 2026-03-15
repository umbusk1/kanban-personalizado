import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendCardAssignedEmail, sendCardEditedEmail } from "@/lib/email"  // ← NUEVO

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

    const { title, description, priority, assignedTo, dueDate, alertDate, resources, blockedById } = await request.json()  // ← 5E: blockedById

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

    // ← NUEVO: detectar si el asignado va a cambiar
    const oldAssignedTo = card.assignedTo
    const newAssignedTo = assignedTo !== undefined ? assignedTo : oldAssignedTo
    const assigneeChanged = assignedTo !== undefined && assignedTo !== oldAssignedTo

    // Actualizar tarjeta
    const updatedCard = await prisma.card.update({
      where: { id: params.id },
      data: {
        title:       title       ?? card.title,
        description: description !== undefined ? description : card.description,
        priority:    priority    !== undefined ? priority    : card.priority,
        assignedTo:  assignedTo  !== undefined ? (assignedTo || null) : card.assignedTo,  // ← FIX 5C: "" → null
        dueDate:     dueDate     !== undefined ? (dueDate   ? new Date(dueDate)   : null) : card.dueDate,
        alertDate:   alertDate   !== undefined ? (alertDate ? new Date(alertDate) : null) : card.alertDate,
        resources:   resources   !== undefined ? resources   : card.resources,
        blockedById: blockedById !== undefined ? (blockedById || null) : card.blockedById,  // ← 5E
      },
      include: {
        assignee: true,
        creator:  true,
        blockedBy: { select: { id: true, title: true, columnId: true } },  // ← 5E
      },
    })

    // ← NUEVO: lógica de emails post-edición
    const editorName = session.user.name || session.user.email || "Un compañero"
    const boardName  = card.column.board.name

    if (assigneeChanged && updatedCard.assignee) {
      // Caso 1: el asignado cambió → notificar a la nueva persona (si no es quien editó)
      if (updatedCard.assignee.id !== session.user.id) {
        try {
          await sendCardAssignedEmail({
            to:             updatedCard.assignee.email,
            assigneeName:   updatedCard.assignee.name  || updatedCard.assignee.email,
            cardTitle:      updatedCard.title,
            boardName,
            assignedByName: editorName,
          })
        } catch (emailError) {
          console.error("Error enviando email de nueva asignación:", emailError)
        }
      }
    } else if (!assigneeChanged && updatedCard.assignee) {
      // Caso 2: el asignado no cambió, pero alguien más editó la hoja → notificar al asignado
      if (updatedCard.assignee.id !== session.user.id) {
        try {
          await sendCardEditedEmail({
            to:           updatedCard.assignee.email,
            assigneeName: updatedCard.assignee.name  || updatedCard.assignee.email,
            cardTitle:    updatedCard.title,
            boardName,
            editedByName: editorName,
          })
        } catch (emailError) {
          console.error("Error enviando email de edición:", emailError)
        }
      }
    }

    return NextResponse.json(updatedCard)

  } catch (error) {
    console.error("Error al actualizar tarjeta:", error)
    return NextResponse.json(
      { error: "Error al actualizar tarjeta" },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar tarjeta (sin cambios)
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
