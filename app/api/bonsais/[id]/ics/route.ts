// GET /api/bonsais/:id/ics — descarga el Bonsai completo (todos sus Sprints) como calendario (.ics)
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generarIcs, nombreArchivo } from "@/lib/ics"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const bonsai = await prisma.bonsai.findUnique({
    where: { id: params.id },
    include: {
      sprints: {
        orderBy: { createdAt: "asc" },
        include: { members: true, columns: { orderBy: { position: "asc" }, include: { cards: { orderBy: { position: "asc" } } } } },
      },
    },
  })
  if (!bonsai) return NextResponse.json({ error: "Bonsai no encontrado" }, { status: 404 })
  const uid = session.user.id
  const esDueño = bonsai.ownerId === uid
  // Quien no es dueño del Bonsai solo exporta los Sprints a los que tiene acceso
  const sprints = bonsai.sprints.filter((s) => esDueño || s.ownerId === uid || s.members.some((m) => m.userId === uid))
  if (sprints.length === 0) return NextResponse.json({ error: "No tienes acceso a este bonsai" }, { status: 403 })

  const origen = new URL(request.url).origin
  const hojas = sprints.flatMap((s) =>
    s.columns.flatMap((col) => col.cards.map((c) => ({ ...c, columnName: col.name, sprintName: s.name }))))
  const { ics } = generarIcs(bonsai.name, hojas, `${origen}/bonsais`)
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivo(bonsai.name)}"`,
    },
  })
}
