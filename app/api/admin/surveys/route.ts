import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    })
    if (!user?.isAdmin) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const surveys = await prisma.usageSurvey.findMany({
      orderBy: { createdAt: "desc" },
    })

    // Calcular agregados
    const total      = surveys.length
    const wantsMore  = surveys.filter(s => s.wantsMore).length
    const noMore     = total - wantsMore

    const bonsaiCounts: Record<number, number> = {}
    const sprintCounts: Record<number, number> = {}

    for (const s of surveys) {
      if (s.bonsaisPerWeek) bonsaiCounts[s.bonsaisPerWeek] = (bonsaiCounts[s.bonsaisPerWeek] || 0) + 1
      if (s.sprintsPerWeek) sprintCounts[s.sprintsPerWeek] = (sprintCounts[s.sprintsPerWeek] || 0) + 1
    }

    return NextResponse.json({ surveys, total, wantsMore, noMore, bonsaiCounts, sprintCounts })
  } catch (error) {
    console.error("Error al obtener encuestas:", error)
    return NextResponse.json({ error: "Error al obtener encuestas" }, { status: 500 })
  }
}
