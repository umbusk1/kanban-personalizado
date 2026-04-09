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
    const bonsais = await prisma.bonsai.findMany({
      where: { ownerId: session.user.id },
      orderBy: { createdAt: "asc" },
    })
    return NextResponse.json(bonsais)
  } catch (error) {
    console.error("Error al obtener bonsais:", error)
    return NextResponse.json({ error: "Error al obtener bonsais" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }
    const { name, description } = await request.json()
    if (!name) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
    }
    const bonsai = await prisma.bonsai.create({
      data: {
        name,
        description: description || null,
        ownerId: session.user.id,
      },
    })
    return NextResponse.json(bonsai, { status: 201 })
  } catch (error) {
    console.error("Error al crear bonsai:", error)
    return NextResponse.json({ error: "Error al crear bonsai" }, { status: 500 })
  }
}
