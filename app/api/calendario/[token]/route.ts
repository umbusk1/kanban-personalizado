// GET /api/calendario/:llave.ics — el calendario de un Bonsai leído con el enlace privado (sin iniciar sesión).
// En cada lectura se revisa que la persona dueña del enlace siga teniendo acceso: si la sacan del
// bonsai, su enlace deja de mostrar esos sprints.
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { nombreArchivo } from "@/lib/ics"
import { icsDeBonsai } from "@/lib/bonsaiIcs"

export const dynamic = "force-dynamic"

export async function GET(request: Request, { params }: { params: { token: string } }) {
  const token = params.token.replace(/\.ics$/i, "")
  const noEncontrado = () => NextResponse.json({ error: "Enlace no válido" }, { status: 404, headers: { "Cache-Control": "no-store" } })
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return noEncontrado()

  const enlace = await prisma.enlaceCalendario.findUnique({ where: { token } })
  if (!enlace) return noEncontrado()

  const origen = new URL(request.url).origin
  const r = await icsDeBonsai(enlace.bonsaiId, enlace.userId, `${origen}/bonsais`)
  if ("error" in r) return noEncontrado()
  return new NextResponse(r.ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${nombreArchivo(r.nombre)}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  })
}
