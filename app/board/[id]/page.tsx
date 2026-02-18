import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from '@/lib/prisma'
import Link from "next/link"

export default async function BoardDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  // Obtener el tablero específico
  const board = await prisma.board.findUnique({
    where: { id: params.id },
    include: {
      columns: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: {
              assignee: true,
            },
          },
        },
      },
      owner: true,
      members: {
        include: {
          user: true,
        },
      },
    },
  })

  // Verificar si el tablero existe
  if (!board) {
    notFound()
  }

  // Verificar si el usuario tiene acceso
  const hasAccess = 
    board.ownerId === session.user.id ||
    board.members.some(member => member.userId === session.user.id)

  if (!hasAccess) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      {/* Header con navegación */}
      <div className="mb-4 flex justify-between items-center">
        <Link
          href="/dashboard"
          className="text-blue-600 hover:underline text-sm"
        >
          ← Volver al Dashboard
        </Link>
        <Link
          href="/api/auth/signout"
          className="text-sm text-red-600 hover:text-red-700"
        >
          Salir
        </Link>
      </div>

      {/* Info del tablero */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{board.name}</h1>
        {board.description && (
          <p className="text-gray-600 dark:text-gray-400 mb-2">{board.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>Propietario: {board.owner.name || board.owner.email}</span>
          <span>•</span>
          <span>{board.members.length + 1} miembros</span>
          <span>•</span>
          <span>{board.columns.length} columnas</span>
        </div>
      </div>

      {/* Columnas y Tarjetas */}
      <div className="flex gap-6 overflow-x-auto pb-4">
        {board.columns.map((column) => (
          <div
            key={column.id}
            className="flex-shrink-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-md"
          >
            {/* Header de Columna */}
            <div 
              className="p-4 border-b-4" 
              style={{ borderColor: column.color || '#gray' }}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">{column.name}</h2>
                {column.wipLimit && (
                  <span className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {column.cards.length}/{column.wipLimit}
                  </span>
                )}
              </div>
            </div>

            {/* Tarjetas */}
            <div className="p-4 space-y-3 min-h-[200px]">
              {column.cards.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">
                  No hay tarjetas
                </p>
              ) : (
                column.cards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <h3 className="font-medium mb-2">{card.title}</h3>
                    {card.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {card.description}
                      </p>
                    )}
                    
                    {/* Footer de Tarjeta */}
                    <div className="flex items-center justify-between text-xs">
                      {card.priority && (
                        <span
                          className={`px-2 py-1 rounded font-medium ${
                            card.priority === 'alta'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : card.priority === 'media'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}
                        >
                          {card.priority}
                        </span>
                      )}
                      
                      {card.assignee && (
                        <div className="flex items-center gap-1">
                          <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">
                            {card.assignee.name?.[0] || card.assignee.email[0].toUpperCase()}
                          </div>
                          <span className="text-gray-600 dark:text-gray-400">
                            {card.assignee.name || card.assignee.email}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
