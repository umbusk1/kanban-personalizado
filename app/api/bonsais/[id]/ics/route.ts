// GET /api/bonsais/:id/ics — descarga el Bonsai completo (todos sus Sprints) como calendario (.ics)
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { nombreArchivo } from "@/lib/ics"
import { icsDeBonsai } from "@/lib/bonsaiIcs"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const origen = new URL(request.url).origin
  const r = await icsDeBonsai(params.id, session.user.id, `${origen}/bonsais`)
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status })
  return new NextResponse(r.ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombreArchivo(r.nombre)}"`,
    },
  })
}
