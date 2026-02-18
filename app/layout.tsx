import type { Metadata } from "next"
import "./globals.css"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import SessionProviderWrapper from "@/components/SessionProviderWrapper"

export const metadata: Metadata = {
  title: "KANBAN Personalizado",
  description: "Sistema de gestión de proyectos colaborativo",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="es">
      <body className="antialiased">
        <SessionProviderWrapper session={session}>
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  )
}