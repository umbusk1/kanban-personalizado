import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Debes iniciar sesión primero' }, { status: 401 })
    }

    const invitation = await prisma.boardInvitation.findUnique({
      where: { token: params.token },
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitación no válida' }, { status: 404 })
    }

    // Verificar que el usuario logueado es el invitado
    if (session.user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Esta invitación fue enviada a otro correo electrónico' },
        { status: 403 }
      )
    }

    if (invitation.status === 'expired') {
      return NextResponse.json({ error: 'Esta invitación ha expirado' }, { status: 400 })
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.boardInvitation.update({
        where: { token: params.token },
        data: { status: 'expired' },
      })
      return NextResponse.json({ error: 'Esta invitación ha expirado' }, { status: 400 })
    }

    // Verificar si ya es miembro antes de insertar
    const existingMember = await prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId: invitation.boardId,
          userId: session.user.id,
        },
      },
    })

    // Crear miembro si no existe
    if (!existingMember) {
      await prisma.boardMember.create({
        data: {
          boardId: invitation.boardId,
          userId: session.user.id,
          role: 'member',
        },
      })
    }

    // Marcar invitación como aceptada (aunque ya lo fuera antes)
    await prisma.boardInvitation.update({
      where: { token: params.token },
      data: { status: 'accepted' },
    })

    return NextResponse.json({ boardId: invitation.boardId })

  } catch (error) {
    console.error('Error al aceptar invitación:', error)
    return NextResponse.json({ error: 'Error interno al procesar la invitación' }, { status: 500 })
  }
}
