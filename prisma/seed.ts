import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...')

  // Limpiar datos existentes (opcional, cuidado en producción)
  await prisma.card.deleteMany()
  await prisma.column.deleteMany()
  await prisma.boardMember.deleteMany()
  await prisma.board.deleteMany()
  await prisma.user.deleteMany()

  // Crear usuario de prueba
  const user = await prisma.user.create({
    data: {
      email: 'demo@kanban.com',
      name: 'Usuario Demo',
      // En producción esto sería un hash real, pero para demo usamos texto plano
      passwordHash: 'demo123', 
    },
  })

  console.log('✅ Usuario creado:', user.email)

  // Crear tablero de prueba
  const board = await prisma.board.create({
    data: {
      name: 'Mi Primer Tablero',
      description: 'Tablero de prueba para desarrollo',
      ownerId: user.id,
    },
  })

  console.log('✅ Tablero creado:', board.name)

  // Crear columnas
  const backlog = await prisma.column.create({
    data: {
      boardId: board.id,
      name: 'Backlog',
      position: 1,
      color: '#3b82f6',
    },
  })

  const doing = await prisma.column.create({
    data: {
      boardId: board.id,
      name: 'En Progreso',
      position: 2,
      wipLimit: 5,
      color: '#eab308',
    },
  })

  const done = await prisma.column.create({
    data: {
      boardId: board.id,
      name: 'Completado',
      position: 3,
      color: '#22c55e',
    },
  })

  console.log('✅ Columnas creadas')

  // Crear hojas de prueba
  await prisma.card.create({
    data: {
      columnId: backlog.id,
      title: 'Diseñar interfaz de usuario',
      description: 'Crear mockups del tablero KANBAN',
      createdBy: user.id,
      position: 1,
      priority: 'alta',
    },
  })

  await prisma.card.create({
    data: {
      columnId: backlog.id,
      title: 'Implementar drag & drop',
      description: 'Permitir mover hojas entre columnas',
      createdBy: user.id,
      position: 2,
      priority: 'media',
    },
  })

  await prisma.card.create({
    data: {
      columnId: doing.id,
      title: 'Configurar base de datos',
      description: 'Setup de Prisma y Neon',
      createdBy: user.id,
      assignedTo: user.id,
      position: 1,
      priority: 'alta',
    },
  })

  await prisma.card.create({
    data: {
      columnId: done.id,
      title: 'Setup inicial del proyecto',
      description: 'Crear estructura Next.js + Tailwind',
      createdBy: user.id,
      position: 1,
    },
  })

  console.log('✅ Hojas creadas')
  console.log(`
  🎉 Seed completado exitosamente!
  
  📊 Datos creados:
  - Usuario: ${user.email}
  - Tablero: ${board.name}
  - Columnas: 3 (Backlog, En Progreso, Completado)
  - Hojas: 4 Hojas de ejemplo
  
  🔗 ID del tablero: ${board.id}
  `)
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
