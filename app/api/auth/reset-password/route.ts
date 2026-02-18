import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const { token, password } = await req.json()

  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'La clave debe tener al menos 6 caracteres' }, { status: 400 })
  }

  // Buscar el token
  const records = await prisma.$queryRaw<Array<{
    id: string; email: string; expiresAt: Date; used: boolean
  }>>`
    SELECT id, email, "expiresAt", used
    FROM password_reset_tokens
    WHERE token = ${token}
    LIMIT 1
  `

  const record = records[0]

  if (!record) {
    return NextResponse.json({ error: 'Enlace no válido' }, { status: 400 })
  }
  if (record.used) {
    return NextResponse.json({ error: 'Este enlace ya fue usado' }, { status: 400 })
  }
  if (new Date() > new Date(record.expiresAt)) {
    return NextResponse.json({ error: 'Este enlace ha expirado' }, { status: 400 })
  }

  // Actualizar la clave del usuario
  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.user.update({
    where: { email: record.email },
    data: { passwordHash },
  })

  // Marcar el token como usado
  await prisma.$executeRaw`
    UPDATE password_reset_tokens SET used = true WHERE id = ${record.id}
  `

  return NextResponse.json({ success: true })
}
