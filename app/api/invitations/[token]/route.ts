import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
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
  if (invitation.status !== 'pending') {
    return NextResponse.json({ error: 'Esta invitación ya fue usada o expiró' }, { status: 400 })
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

  // Solo crear si no existe ya
  if (!existingMember) {
    await prisma.boardMember.create({
      data: {
        boardId: invitation.boardId,
        userId: session.user.id,
        role: 'member',
      },
    })
  }

  // Marcar invitación como aceptada
  await prisma.boardInvitation.update({
    where: { token: params.token },
    data: { status: 'accepted' },
  })

  return NextResponse.json({ boardId: invitation.boardId })
}
