import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { wantsMore, bonsaisPerWeek, sprintsPerWeek } = await request.json()

    await prisma.usageSurvey.create({
      data: {
        userId:        session?.user?.id ?? null,
        email:         session?.user?.email ?? "anónimo",
        wantsMore,
        bonsaisPerWeek: bonsaisPerWeek ?? null,
        sprintsPerWeek: sprintsPerWeek ?? null,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error en usage-survey:", error)
    return NextResponse.json({ error: "Error al guardar respuesta" }, { status: 500 })
  }
}
