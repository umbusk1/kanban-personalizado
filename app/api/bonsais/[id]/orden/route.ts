// PATCH /api/bonsais/:id/orden — guarda el orden de los Sprints dentro de un Bonsai.
// Solo el dueño del Bonsai puede reordenar; los miembros ven el orden resultante.
//
// Dos formas de llamarlo:
//   { "orden": ["idSprintA", "idSprintB", ...] }   → orden elegido a mano (flechas ▲ ▼)
//   { "ordenarPorFecha": true }                     → orden cronológico (botón "Ordenar por fecha")
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ordenarSprintsPorFecha } from "@/lib/lapso"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const bonsai = await prisma.bonsai.findUnique({ where: { id: params.id }, select: { id: true, ownerId: true } })
    if (!bonsai) {
      return NextResponse.json({ error: "Bonsai no encontrado" }, { status: 404 })
    }
    if (bonsai.ownerId !== session.user.id) {
      return NextResponse.json({ error: "Solo el dueño del bonsai puede cambiar el orden de los sprints" }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))

    // Sprints actuales del bonsai, en el orden en que se ven hoy
    const sprints = await prisma.board.findMany({
      where: { bonsaiId: params.id },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        columns: { select: { cards: { select: { startDate: true, dueDate: true } } } },
      },
    })
    const idsActuales = sprints.map((s) => s.id)

    let nuevoOrden: string[]

    if (body?.ordenarPorFecha === true) {
      // Por la primera fecha de inicio de sus hojas (si ninguna tiene inicio, por su primera
      // fecha límite). Los sprints sin ninguna fecha quedan al final, en su orden anterior.
      nuevoOrden = ordenarSprintsPorFecha(
        sprints.map((s) => ({ id: s.id, hojas: s.columns.flatMap((c) => c.cards) }))
      )
    } else {
      const orden = body?.orden
      if (!Array.isArray(orden) || orden.some((id) => typeof id !== "string")) {
        return NextResponse.json({ error: "Se requiere 'orden' con la lista de ids de los sprints" }, { status: 400 })
      }
      // Debe ser exactamente el conjunto de sprints del bonsai: ni uno más, ni uno menos, ni repetidos
      const sinRepetir = new Set<string>(orden)
      const coincide =
        sinRepetir.size === orden.length &&
        orden.length === idsActuales.length &&
        idsActuales.every((id) => sinRepetir.has(id))
      if (!coincide) {
        return NextResponse.json(
          { error: "La lista no coincide con los sprints de este bonsai. Recarga la página e inténtalo de nuevo." },
          { status: 400 }
        )
      }
      nuevoOrden = orden
    }

    // Guardar 0, 1, 2... todo junto: o se guardan todas las posiciones o ninguna
    await prisma.$transaction(
      nuevoOrden.map((id, indice) => prisma.board.update({ where: { id }, data: { position: indice } }))
    )

    return NextResponse.json({ ok: true, orden: nuevoOrden })
  } catch (error) {
    console.error("Error al reordenar sprints:", error)
    return NextResponse.json({ error: "Error al reordenar los sprints" }, { status: 500 })
  }
}
