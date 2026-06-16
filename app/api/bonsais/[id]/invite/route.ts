import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'El email es requerido' }, { status: 400 })
    }

    // Verificar que el bonsai existe y que el usuario es el dueño
    const bonsai = await prisma.bonsai.findFirst({
      where: { id: params.id, ownerId: session.user.id },
      include: {
        sprints: { select: { id: true, name: true } },
      },
    })

    if (!bonsai) {
      return NextResponse.json({ error: 'No tienes permiso para invitar a este proyecto' }, { status: 403 })
    }

    if (bonsai.sprints.length === 0) {
      return NextResponse.json({ error: 'Este bonsai no tiene sprints todavía' }, { status: 400 })
    }

    // Para cada sprint del bonsai, crear una invitación (si no existe ya una pendiente)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Guardamos el token del primer sprint para el enlace del email
    // (al aceptarlo, procesamos todos los demás automáticamente)
    const tokens: string[] = []

    for (const sprint of bonsai.sprints) {
      // Saltar si ya es miembro de este sprint
      const alreadyMember = await prisma.boardMember.findFirst({
        where: { boardId: sprint.id, user: { email } },
      })
      if (alreadyMember) continue

      // Saltar si ya tiene invitación pendiente para este sprint
      const alreadyInvited = await prisma.boardInvitation.findFirst({
        where: { boardId: sprint.id, email, status: 'pending' },
      })
      if (alreadyInvited) {
        tokens.push(alreadyInvited.token)
        continue
      }

      const invitation = await prisma.boardInvitation.create({
        data: { boardId: sprint.id, email, expiresAt },
      })
      tokens.push(invitation.token)
    }

    if (tokens.length === 0) {
      return NextResponse.json({ error: 'Este usuario ya es miembro de todos los sprints del proyecto' }, { status: 400 })
    }

    // El enlace del email apunta a una página especial que acepta TODOS los tokens de golpe
    const inviteUrl = `${process.env.NEXTAUTH_URL}/invite-bonsai/${params.id}?tokens=${tokens.join(',')}&email=${encodeURIComponent(email)}`

    const sprintList = bonsai.sprints
      .map((s, i) => `<li style="margin: 4px 0; color: #a7f3d0;">🌿 Sprint ${i + 1}: ${s.name}</li>`)
      .join('')

    await resend.emails.send({
      from: 'KANBAN Umbusk <noreply@compita.umbusk.com>',
      to: email,
      subject: `Te invitaron al proyecto "${bonsai.name}" en KanbanBonsai`,
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #0d1117; border-radius: 12px;">
          <h2 style="color: #c9a96e; margin-bottom: 8px;">🌳 Invitación a proyecto</h2>
          <p style="color: #a7f3d0;">
            <strong style="color: #d1fae5;">${session.user.name || session.user.email}</strong>
            te invitó a colaborar en el proyecto
            <strong style="color: #d1fae5;">"${bonsai.name}"</strong>.
          </p>
          <p style="color: #6ee7b7; margin-top: 16px; margin-bottom: 8px;">Este proyecto incluye los siguientes sprints:</p>
          <ul style="padding-left: 20px; margin: 0 0 24px;">
            ${sprintList}
          </ul>
          <div style="text-align: center; margin: 24px 0;">
            <a href="${inviteUrl}" style="
              display: inline-block;
              background: #c9a96e;
              color: #0d1117;
              padding: 14px 32px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: bold;
              font-size: 1em;
            ">
              ✅ Aceptar invitación al proyecto
            </a>
          </div>
          <p style="color: #475569; font-size: 13px; text-align: center;">
            Este enlace expira en 7 días. Si no esperabas esta invitación, puedes ignorar este correo.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ success: true, sprints: tokens.length })

  } catch (error) {
    console.error('Error al invitar al bonsai:', error)
    return NextResponse.json({ error: 'Error interno al procesar la invitación' }, { status: 500 })
  }
}
