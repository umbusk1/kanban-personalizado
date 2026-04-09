"use client"
import Link from "next/link"
import Image from "next/image"
import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"

export default function AppHeader() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push("/login")
  }

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center">
          <Image
            src="/logo.svg"
            alt="kanbanbonsai"
            width={220}
            height={80}
            className="h-14 w-auto transition-opacity hover:opacity-80"
          />
        </Link>

        {/* Nav central */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          <Link href="/dashboard"
            className={`px-4 py-2 rounded-lg transition-colors text-base font-bold uppercase tracking-wide ${
              pathname === "/dashboard"
                ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}>
            Mis Sprints
          </Link>
          <Link href="/bonsais"
            className={`px-4 py-2 rounded-lg transition-colors text-base font-bold uppercase tracking-wide ${
              pathname === "/bonsais"
                ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}>
            Mis Bonsais
          </Link>
          {(session?.user as any)?.isAdmin && (
            <Link href="/admin"
              className="px-4 py-2 rounded-lg hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-gray-600 dark:text-gray-400">
              🛡️ Admin
            </Link>
          )}
        </nav>

        {/* Usuario + salir */}
        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
            {session?.user?.name || session?.user?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors"
          >
            Salir
          </button>
        </div>

      </div>
    </header>
  )
}
