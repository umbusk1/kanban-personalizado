"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { Suspense } from "react"

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Error al registrarse")
        setLoading(false)
        return
      }

      // Auto-login después del registro y redirigir al callbackUrl
      await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      router.push(callbackUrl)
    } catch {
      setError("Error al crear cuenta")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold">
            🎯 KANBAN Personalizado
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Crea tu cuenta
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="appearance-none rounded-lg block w-full px-3 py-2 border border-gray-300
                         dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400
                         text-gray-900 dark:text-white dark:bg-gray-800 focus:outline-none
                         focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Nombre (opcional)"
            />
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="appearance-none rounded-lg block w-full px-3 py-2 border border-gray-300
                         dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400
                         text-gray-900 dark:text-white dark:bg-gray-800 focus:outline-none
                         focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Email"
            />
            <input
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="appearance-none rounded-lg block w-full px-3 py-2 border border-gray-300
                         dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400
                         text-gray-900 dark:text-white dark:bg-gray-800 focus:outline-none
                         focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Password (mínimo 6 caracteres)"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm
                       font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700
                       focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creando cuenta..." : "Crear Cuenta"}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Cargando...</p></div>}>
      <RegisterForm />
    </Suspense>
  )
}
