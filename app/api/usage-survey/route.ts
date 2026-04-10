import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const { wantsMore, bonsaisPerWeek, sprintsPerWeek } = await request.json()

    // Por ahora registramos en los logs de Vercel para análisis.
    // Cuando conectemos Stripe, aquí irá la lógica de upgrade.
    console.log("[USAGE_SURVEY]", {
      userId:        session?.user?.id ?? "anonymous",
      email:         session?.user?.email ?? "unknown",
      wantsMore,
      bonsaisPerWeek,
      sprintsPerWeek,
      timestamp:     new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error en usage-survey:", error)
    return NextResponse.json({ error: "Error al guardar respuesta" }, { status: 500 })
  }
}
