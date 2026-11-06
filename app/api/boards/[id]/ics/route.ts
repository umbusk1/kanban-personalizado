// GET /api/boards/:id/ics — descarga el Sprint como calendario (.ics)
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generarIcs, nombreArchivo } from "@/lib/ics"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const board = await prisma.board.findUnique({
    where: { id: params.id },
    include: { members: true, columns: { orderBy: { position: "asc" }, include: { cards: { orderBy: { position: "asc" } } } } },
  })
  if (!board) return NextResponse.json({ error: "Sprint no encontrado" }, { status: 404 })
  const acceso = board.ownerId === session.user.id || board.members.some((m) => m.userId === session.user.id)
  if (!acceso) return NextResponse.json({ error: "No tienes acceso a este sprint" }, { status: 403 })

  const origen = new URL(request.url).origin
  const hojas = board.columns.flatMap((col) =>
    col.cards.map((c) => ({ ...c, columnName: col.name, sprintName: board.name })))
  const { ics } = generarIcs(board.name, hojas, `${origen}/board/${board.id}`)
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivo(board.name)}"`,
    },
  })
}
