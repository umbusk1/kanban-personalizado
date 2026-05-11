import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

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

        // Decodificar el token base64-JSON de Compita
        let decoded: { empresa_id: number; email: string; nombre: string; plan: string }
        try {
          // Soporta JWT (header.payload.firma) y base64-JSON plano
          const parts = credentials.compitaToken.split('.')
          const segment = parts.length === 3 ? parts[1] : credentials.compitaToken
          const base64  = segment.replace(/-/g, '+').replace(/_/g, '/')
          const padded  = base64 + '=='.slice(0, (4 - base64.length % 4) % 4)
          decoded = JSON.parse(Buffer.from(padded, "base64").toString("utf-8"))
        } catch {
          throw new Error("Token de Compita inválido")
        }

        if (!decoded.email || !decoded.empresa_id) {
          throw new Error("Token de Compita incompleto")
        }

        // Buscar o crear el usuario en KB
        const user = await prisma.user.upsert({
          where: { email: decoded.email },
          update: {
            empresaId: decoded.empresa_id,
            plan:      decoded.plan ?? null,
            name:      decoded.nombre ?? null,
          },
          create: {
            email:        decoded.email,
            name:         decoded.nombre ?? null,
            passwordHash: null,           // sin contraseña KB
            empresaId:    decoded.empresa_id,
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
