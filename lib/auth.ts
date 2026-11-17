import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { verifyCompitaToken } from "./compitaToken"

export const authOptions: NextAuthOptions = {
  providers: [

    // ── Provider 1: login nativo KB (email + contraseña) ─────────────────────
    CredentialsProvider({
      id: "credentials",
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email y password son requeridos")
        }
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
        if (!user) throw new Error("Usuario no encontrado")

        // Usuarios Compita no tienen passwordHash en KB
        if (!user.passwordHash) {
          throw new Error("Esta cuenta usa login de Compita. Usa el botón 'Entrar con Compita'.")
        }
        const ok = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!ok) throw new Error("Password incorrecto")

        return {
          id:        user.id,
          email:     user.email,
          name:      user.name,
          isAdmin:   user.isAdmin,
          empresaId: user.empresaId ?? null,
          plan:      user.plan ?? null,
        }
      },
    }),

    // ── Provider 2: login vía token Compita ───────────────────────────────────
    CredentialsProvider({
      id: "compita",
      name: "compita",
      credentials: {
        compitaToken: { label: "Token Compita", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.compitaToken) {
          throw new Error("Token de Compita requerido")
        }

        // Verificar la firma y el vencimiento del pase de Compita
        const decoded = verifyCompitaToken(credentials.compitaToken)
        if (!decoded) {
          throw new Error("Token de Compita inválido o vencido")
        }

        // Las cuentas de administrador de KanbanBonsai entran solo con contraseña
        const existing = await prisma.user.findUnique({
          where:  { email: decoded.email },
          select: { isAdmin: true },
        })
        if (existing?.isAdmin) {
          throw new Error("Esta cuenta entra con correo y contraseña, no con Compita.")
        }

        const user = await prisma.user.upsert({
          where: { email: decoded.email },
          update: {
            empresaId: decoded.empresaId,
            plan:      decoded.plan ?? null,
          },
          create: {
            email:        decoded.email,
            name:         decoded.email,   // JWT no trae nombre
            passwordHash: null,
            empresaId:    decoded.empresaId,
            plan:         decoded.plan ?? null,
          },
        })

        return {
          id:        user.id,
          email:     user.email,
          name:      user.name,
          isAdmin:   user.isAdmin,
          empresaId: user.empresaId ?? null,
          plan:      user.plan ?? null,
        }
      },
    }),
  ],

  session: { strategy: "jwt" },

  pages: { signIn: "/login" },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id        = user.id
        token.isAdmin   = (user as any).isAdmin
        token.empresaId = (user as any).empresaId ?? null
        token.plan      = (user as any).plan ?? null
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id                    = token.id as string
        ;(session.user as any).isAdmin     = token.isAdmin
        ;(session.user as any).empresaId   = token.empresaId ?? null
        ;(session.user as any).plan        = token.plan ?? null
      }
      return session
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
}
