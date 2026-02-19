"use client"

import Link from "next/link"
import Image from "next/image"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function AppHeader() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push("/login")
  }

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center group">
          <Image
            src="/logo.png"
            alt="kanbanbonsai"
            width={220}
            height={80}
            className="h-20 w-auto group-hover:opacity-80 transition-opacity"
          />
        </Link>

        {/* Nav central */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-400">
          <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-white transition-colors">
            Mis Tableros
          </Link>
          {(session?.user as any)?.isAdmin && (
            <Link href="/admin" className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
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
