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

  // No puede quitarse admin a sí mismo
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

// DELETE — eliminar usuario
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

  await prisma.user.delete({ where: { id: params.id } })

  return NextResponse.json({ success: true })
}
