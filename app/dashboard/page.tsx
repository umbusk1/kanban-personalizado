import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/login")
  }

  // Obtener tableros del usuario
  const boards = await prisma.board.findMany({
    where: {
      OR: [
        { ownerId: session.user.id },
        { members: { some: { userId: session.user.id } } }
      ]
    },
    include: {
      owner: true,
      _count: {
        select: { columns: true, members: true }
      }
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">
              🎯 KANBAN Personalizado
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {session.user.email}
              </span>
              <Link
                href="/api/auth/signout"
                className="text-sm text-red-600 hover:text-red-700"
              >
                Salir
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">
            Bienvenido, {session.user.name || session.user.email}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Aquí están tus tableros
          </p>
        </div>

        {/* Lista de Tableros */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((board) => (
            <Link
              key={board.id}
              href="/board"
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-lg font-semibold mb-2">{board.name}</h3>
              {board.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {board.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{board._count.columns} columnas</span>
                <span>{board._count.members + 1} miembros</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Propietario: {board.owner.name || board.owner.email}
              </p>
            </Link>
          ))}

          {boards.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500 mb-4">
                Aún no tienes tableros
              </p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Crear Primer Tablero
              </button>
            </div>
          )}
        </div>

        {/* Progreso del Proyecto */}
        <div className="mt-12 bg-green-100 dark:bg-green-900 p-6 rounded-lg">
          <p className="text-green-800 dark:text-green-200 font-semibold">
            ✅ Tarjeta 1.3 - Autenticación Completada
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            NextAuth.js funcionando correctamente
          </p>
        </div>
      </div>
    </div>
  )
}
