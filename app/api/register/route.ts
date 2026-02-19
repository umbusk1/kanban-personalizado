import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y password son requeridos" },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        name: name || email.split("@")[0],
        passwordHash: hashedPassword,
      },
      select: { id: true, email: true, name: true, createdAt: true },
    })

    // ── NUEVO: Convertir invitaciones aceptadas en membresías reales ──
    const pendingInvitations = await prisma.boardInvitation.findMany({
      where: {
        email,
        status: "accepted",
        expiresAt: { gt: new Date() },
      },
    })

    if (pendingInvitations.length > 0) {
      await Promise.all(
        pendingInvitations.map(inv =>
          prisma.boardMember.upsert({
            where: { boardId_userId: { boardId: inv.boardId, userId: user.id } },
            create: { boardId: inv.boardId, userId: user.id, role: "member" },
            update: {},
          })
        )
      )
    }

    return NextResponse.json(
      { message: "Usuario creado exitosamente", user },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error en registro:", error)
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    )
  }
}
