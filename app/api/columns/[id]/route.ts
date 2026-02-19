import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const { wipLimit } = await req.json()

  // Verificar que el usuario es dueño del tablero de esta columna
  const column = await prisma.column.findUnique({
    where: { id: params.id },
    include: { board: { select: { ownerId: true } } },
  })

  if (!column) {
    return NextResponse.json({ error: "Columna no encontrada" }, { status: 404 })
  }

  if (column.board.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Solo el dueño puede editar límites WIP" }, { status: 403 })
  }

  const updated = await prisma.column.update({
    where: { id: params.id },
    data: { wipLimit: wipLimit === null ? null : Number(wipLimit) },
  })

  return NextResponse.json(updated)
}
