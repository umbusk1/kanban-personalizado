// Enlace privado del calendario de un Bonsai (para suscribirse desde YouRadar, Google o Apple)
// GET  /api/bonsais/:id/enlace-calendario — devuelve el enlace de la persona (lo crea la primera vez)
// POST /api/bonsais/:id/enlace-calendario — lo cambia: la llave anterior deja de servir
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { nuevaLlave, tieneAccesoBonsai } from "@/lib/bonsaiIcs"

const respuesta = (request: Request, token: string) =>
  NextResponse.json({ url: `${new URL(request.url).origin}/api/calendario/${token}.ics` }, { headers: { "Cache-Control": "no-store" } })

async function quien(params: { id: string }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { res: NextResponse.json({ error: "No autorizado" }, { status: 401 }) }
  if (!(await tieneAccesoBonsai(params.id, session.user.id)))
    return { res: NextResponse.json({ error: "No tienes acceso a este bonsai" }, { status: 403 }) }
  return { userId: session.user.id }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const q = await quien(params)
  if ("res" in q) return q.res
  const enlace = await prisma.enlaceCalendario.upsert({
    where: { userId_bonsaiId: { userId: q.userId, bonsaiId: params.id } },
    update: {},
    create: { userId: q.userId, bonsaiId: params.id, token: nuevaLlave() },
  })
  return respuesta(request, enlace.token)
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const q = await quien(params)
  if ("res" in q) return q.res
  const token = nuevaLlave()
  await prisma.enlaceCalendario.upsert({
    where: { userId_bonsaiId: { userId: q.userId, bonsaiId: params.id } },
    update: { token, createdAt: new Date() },
    create: { userId: q.userId, bonsaiId: params.id, token },
  })
  return respuesta(request, token)
}
