import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const board = await prisma.board.findUnique({
    where: { id: params.id },
    select: { ownerId: true },
  })

  if (!board) {
    return NextResponse.json({ error: 'Tablero no encontrado' }, { status: 404 })
  }

  const isOwner = board.ownerId === session.user.id
  const isSelf = params.userId === session.user.id

  // Solo el dueño puede expulsar a otros, o el propio miembro puede salir
  if (!isOwner && !isSelf) {
    return NextResponse.json({ error: 'No tienes permiso' }, { status: 403 })
  }

  // El dueño no puede ser expulsado
  if (params.userId === board.ownerId) {
    return NextResponse.json({ error: 'No se puede eliminar al dueño del tablero' }, { status: 400 })
  }

  await prisma.boardMember.delete({
    where: {
      boardId_userId: {
        boardId: params.id,
        userId: params.userId,
      },
    },
  })

  return NextResponse.json({ success: true })
}
