import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendCardAssignedEmail, sendCardEditedEmail, sendCardUnassignedEmail } from "@/lib/email"  // ← añadido sendCardUnassignedEmail

// PATCH - Editar hoja
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

    const { title, description, priority, assignedTo, dueDate, alertDate, resources, blockedById } = await request.json()

    // Verificar que la hoja existe y el usuario tiene acceso
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
        assignee: true,  // ← necesario para obtener datos del asignado anterior
      },
    })

    if (!card) {
      return NextResponse.json({ error: "Hoja no encontrada" }, { status: 404 })
    }

    const hasAccess =
      card.column.board.ownerId === session.user.id ||
      card.column.board.members.some(m => m.userId === session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: "No tienes acceso" }, { status: 403 })
    }

    // Detectar cambio de asignado
    const oldAssignedTo = card.assignedTo
    const assigneeChanged = assignedTo !== undefined && assignedTo !== oldAssignedTo

    // Guardar datos del asignado anterior ANTES de actualizar
    const prevAssignee = card.assignee  // puede ser null si no había nadie

    // Actualizar hoja
    const updatedCard = await prisma.card.update({
      where: { id: params.id },
      data: {
        title:       title       ?? card.title,
        description: description !== undefined ? description : card.description,
        priority:    priority    !== undefined ? priority    : card.priority,
        assignedTo:  assignedTo  !== undefined ? (assignedTo || null) : card.assignedTo,
        dueDate:     dueDate     !== undefined ? (dueDate   ? new Date(dueDate)   : null) : card.dueDate,
        alertDate:   alertDate   !== undefined ? (alertDate ? new Date(alertDate) : null) : card.alertDate,
        resources:   resources   !== undefined ? resources   : card.resources,
        blockedById: blockedById !== undefined ? (blockedById || null) : card.blockedById,
      },
      include: {
        assignee: true,
        creator:  true,
        blockedBy: { select: { id: true, title: true, columnId: true } },
      },
    })

    // Lógica de emails post-edición
    const editorName = session.user.name || session.user.email || "Un compañero"
    const boardName  = card.column.board.name

    if (assigneeChanged) {
      // ── Caso A: había asignado anterior y se lo quitaron para dárselo a otro ──
      const prevWasRealPerson = prevAssignee && prevAssignee.id !== session.user.id
      const newIsRealPerson   = updatedCard.assignee && updatedCard.assignee.id !== session.user.id

      if (prevWasRealPerson && newIsRealPerson) {
        // Notificar a quien perdió la hoja
        try {
          await sendCardUnassignedEmail({
            to:               prevAssignee.email,
            prevAssigneeName: prevAssignee.name || prevAssignee.email,
            cardTitle:        updatedCard.title,
            boardName,
            reassignedByName: editorName,
            newAssigneeName:  updatedCard.assignee!.name || updatedCard.assignee!.email,
          })
        } catch (e) { console.error("Error enviando email de reasignación:", e) }

        // Notificar a quien recibió la hoja
        try {
          await sendCardAssignedEmail({
            to:             updatedCard.assignee!.email,
            assigneeName:   updatedCard.assignee!.name || updatedCard.assignee!.email,
            cardTitle:      updatedCard.title,
            boardName,
            assignedByName: editorName,
          })
        } catch (e) { console.error("Error enviando email de nueva asignación:", e) }

      } else if (!prevAssignee && newIsRealPerson) {
        // ── Caso B: no había nadie asignado y se asigna a alguien ──
        try {
          await sendCardAssignedEmail({
            to:             updatedCard.assignee!.email,
            assigneeName:   updatedCard.assignee!.name || updatedCard.assignee!.email,
            cardTitle:      updatedCard.title,
            boardName,
            assignedByName: editorName,
          })
        } catch (e) { console.error("Error enviando email de asignación:", e) }
      }
      // Caso C: se quita el asignado sin poner otro → no se envía email

    } else if (!assigneeChanged && updatedCard.assignee) {
      // ── Caso D: el asignado no cambió pero alguien más editó la hoja ──
      if (updatedCard.assignee.id !== session.user.id) {
        try {
          await sendCardEditedEmail({
            to:           updatedCard.assignee.email,
            assigneeName: updatedCard.assignee.name || updatedCard.assignee.email,
            cardTitle:    updatedCard.title,
            boardName,
            editedByName: editorName,
          })
        } catch (e) { console.error("Error enviando email de edición:", e) }
      }
    }

    return NextResponse.json(updatedCard)

  } catch (error) {
    console.error("Error al actualizar hoja:", error)
    return NextResponse.json({ error: "Error al actualizar hoja" }, { status: 500 })
  }
}

// DELETE - Eliminar hoja (sin cambios)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
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
      return NextResponse.json({ error: "Hoja no encontrada" }, { status: 404 })
    }

    const hasAccess =
      card.column.board.ownerId === session.user.id ||
      card.column.board.members.some(m => m.userId === session.user.id)

    if (!hasAccess) {
      return NextResponse.json({ error: "No tienes acceso" }, { status: 403 })
    }

    await prisma.card.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error("Error al eliminar hoja:", error)
    return NextResponse.json({ error: "Error al eliminar hoja" }, { status: 500 })
  }
}
