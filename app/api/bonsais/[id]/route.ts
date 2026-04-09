import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que el bonsai pertenece al usuario
    const bonsai = await prisma.bonsai.findFirst({
      where: { id: params.id, ownerId: session.user.id },
    })
    if (!bonsai) {
      return NextResponse.json({ error: "Bonsai no encontrado" }, { status: 404 })
    }

    // Eliminar el bonsai (los boards quedan huérfanos — bonsaiId = null)
    await prisma.bonsai.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al eliminar bonsai:", error)
    return NextResponse.json({ error: "Error al eliminar bonsai" }, { status: 500 })
  }
}
