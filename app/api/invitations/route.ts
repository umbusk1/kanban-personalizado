import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { boardId, email } = await req.json()

  // Solo el dueño puede invitar
  const board = await prisma.board.findFirst({
    where: { id: boardId, ownerId: session.user.id },
  })
  if (!board) {
    return NextResponse.json({ error: 'No tienes permiso para invitar' }, { status: 403 })
  }

  // Verificar que no sea ya miembro
  const existing = await prisma.boardMember.findFirst({
    where: { boardId, user: { email } },
  })
  if (existing) {
    return NextResponse.json({ error: 'Este usuario ya es miembro del tablero' }, { status: 400 })
  }

  // Crear invitación con expiración de 7 días
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const invitation = await prisma.boardInvitation.create({
    data: { boardId, email, expiresAt },
  })

  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${invitation.token}`

  // Enviar email con Resend
  await resend.emails.send({
    from: 'KANBAN Umbusk <noreply@compita.umbusk.com>',
    to: email,
    subject: `Te invitaron al tablero "${board.name}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #1e293b; margin-bottom: 8px;">📋 Invitación a tablero KANBAN</h2>
        <p style="color: #475569;">
          <strong>${session.user.name || session.user.email}</strong> te invitó a colaborar en el tablero
          <strong>"${board.name}"</strong>.
        </p>
        <a href="${inviteUrl}" style="
          display: inline-block;
          background: #6366f1;
          color: white;
          padding: 12px 28px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: bold;
          margin: 24px 0;
        ">
          Aceptar invitación
        </a>
        <p style="color: #94a3b8; font-size: 13px;">
          Este enlace expira en 7 días. Si no esperabas esta invitación, puedes ignorar este correo.
        </p>
      </div>
    `,
  })

  return NextResponse.json({ success: true })
}
