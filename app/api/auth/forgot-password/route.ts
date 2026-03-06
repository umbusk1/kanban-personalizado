import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  const genericResponse = NextResponse.json({
    message: 'Si ese email existe, recibirás un enlace para restablecer tu clave.'
  })

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return genericResponse

    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1)

    await prisma.$executeRaw`
      INSERT INTO password_reset_tokens (id, email, token, "expiresAt")
      VALUES (gen_random_uuid()::text, ${email}, ${token}, ${expiresAt})
    `

    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${token}`

    await resend.emails.send({
      from: 'KANBAN Umbusk <noreply@compita.umbusk.com>',
      to: email,
      subject: 'Restablecer clave — KANBAN',
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #1e293b;">🔐 Restablecer clave</h2>
          <p style="color: #475569;">
            Recibimos una solicitud para restablecer la clave de tu cuenta en KANBAN Personalizado.
          </p>
          <a href="${resetUrl}" style="
            display: inline-block;
            background: #6366f1;
            color: white;
            padding: 12px 28px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            margin: 24px 0;
          ">
            Restablecer mi clave
          </a>
          <p style="color: #94a3b8; font-size: 13px;">
            Este enlace expira en 1 hora. Si no solicitaste esto, puedes ignorar este correo.
          </p>
        </div>
      `,
    })

    return genericResponse

  } catch (error) {
    console.error('Error en forgot-password:', error)
    // Devolvemos la misma respuesta genérica para no revelar información
    return genericResponse
  }
}
