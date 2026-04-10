import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const { name, description, bonsaiId } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: "El nombre del tablero es requerido" },
        { status: 400 }
      )
    }

    // Crear tablero con columnas por defecto
    const board = await prisma.board.create({
      data: {
        name,
        description: description || null,
        ownerId: session.user.id,
        bonsaiId: bonsaiId || null,
        columns: {
          create: [
            {
              name: "Por Hacer",
              position: 1,
              color: "#3b82f6",
            },
            {
              name: "En Progreso",
              position: 2,
              color: "#eab308",
              wipLimit: 5,
            },
            {
              name: "Completado",
              position: 3,
              color: "#22c55e",
            },
          ],
        },
      },
      include: {
        columns: true,
      },
    })

    return NextResponse.json(board, { status: 201 })
  } catch (error) {
    console.error("Error al crear tablero:", error)
    return NextResponse.json(
      { error: "Error al crear tablero" },
      { status: 500 }
    )
  }
}
