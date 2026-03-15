import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function isAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  })
  return user?.isAdmin ?? false
}

// PATCH — cambiar rol de admin
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }
  if (params.id === session.user.id) {
    return NextResponse.json({ error: 'No puedes modificar tu propio rol' }, { status: 400 })
  }
  const { isAdmin: newValue } = await req.json()
  const user = await prisma.user.update({
    where: { id: params.id },
    data: { isAdmin: newValue },
    select: { id: true, email: true, isAdmin: true },
  })
  return NextResponse.json(user)
}

// DELETE — eliminar usuario (con limpieza de relaciones)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !(await isAdmin(session.user.id))) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }
  if (params.id === session.user.id) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
  }

  const userId = params.id

  // Limpiar todas las relaciones antes de borrar al usuario
  await prisma.$transaction([
    // 1. Borrar hojas que creó el usuario
    prisma.card.deleteMany({
      where: { createdBy: userId },
    }),
    // 2. Borrar activity logs del usuario
    prisma.activityLog.deleteMany({
      where: { userId },
    }),
    // 3. Quitar al usuario como miembro de tableros
    prisma.boardMember.deleteMany({
      where: { userId },
    }),
  ])

  // Borrar tableros que el usuario creó (y sus columnas/hojas/logs)
  const ownedBoards = await prisma.board.findMany({
    where: { ownerId: userId },
    select: { id: true },
  })
  for (const board of ownedBoards) {
    await prisma.activityLog.deleteMany({ where: { boardId: board.id } })
    await prisma.card.deleteMany({ where: { column: { boardId: board.id } } })
    await prisma.column.deleteMany({ where: { boardId: board.id } })
    await prisma.boardMember.deleteMany({ where: { boardId: board.id } })
    await prisma.board.delete({ where: { id: board.id } })
  }

  // Finalmente borrar al usuario
  await prisma.user.delete({ where: { id: userId } })

  return NextResponse.json({ success: true })
}
