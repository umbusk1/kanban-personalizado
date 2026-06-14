'use client'
import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"

export default function AppHeader() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut({ redirect: false })
    router.push("/login")
  }

  const navLinks = [
    { href: "/dashboard", label: "Mis Sprints" },
    { href: "/bonsais",   label: "Mis Bonsais" },
    ...((session?.user as any)?.isAdmin ? [{ href: "/admin", label: "🛡️ Admin" }] : []),
  ]

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
            className="h-10 md:h-14 w-auto transition-opacity hover:opacity-80"
          />
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href}
              className={`px-4 py-2 rounded-lg transition-colors text-base font-bold uppercase tracking-wide ${
                pathname === link.href
                  ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Derecha: usuario + salir (desktop) y hamburguesa (móvil) */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
            {session?.user?.name || session?.user?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="hidden md:block text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors"
          >
            Salir
          </button>

          {/* Hamburguesa — solo móvil */}
          <button
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5
                       rounded-lg border border-gray-200 dark:border-gray-700
                       bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700
                       transition-colors"
            onClick={() => setMenuOpen(prev => !prev)}
            aria-label="Abrir menú"
          >
            <span className={`block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-transform duration-200 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-opacity duration-200 ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-gray-600 dark:bg-gray-300 transition-transform duration-200 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>

      </div>

      {/* Menú desplegable móvil */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <nav className="px-4 py-2 flex flex-col">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`py-3 text-sm font-semibold border-b border-gray-100 dark:border-gray-800 transition-colors ${
                  pathname === link.href
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                }`}>
                {link.label}
              </Link>
            ))}
            <div className="py-3 flex items-center justify-between">
              <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">
                {session?.user?.name || session?.user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors"
              >
                Salir
              </button>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
