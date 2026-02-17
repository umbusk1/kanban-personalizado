import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import Link from 'next/link'

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session?.user) {
    redirect("/dashboard")
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          🎯 KANBAN Personalizado
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Sistema de gestión de proyectos colaborativo
        </p>
        
        <div className="space-y-4">
          <div className="bg-green-100 dark:bg-green-900 p-6 rounded-lg">
            <p className="text-green-800 dark:text-green-200 font-semibold mb-2">
              ✅ Sprint 1 Completado
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Infraestructura base lista
            </p>
          </div>

          <div className="flex gap-4 justify-center mt-6">
            <Link
              href="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/register"
              className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}