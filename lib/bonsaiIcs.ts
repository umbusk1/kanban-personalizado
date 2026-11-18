// Arma el .ics de un Bonsai para una persona: solo los Sprints a los que esa persona tiene acceso.
// Lo usan la descarga con sesión (/api/bonsais/:id/ics) y el enlace privado (/api/calendario/:llave).
import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import { generarIcs } from "@/lib/ics"

export async function icsDeBonsai(bonsaiId: string, userId: string, urlBase: string) {
  const bonsai = await prisma.bonsai.findUnique({
    where: { id: bonsaiId },
    include: {
      sprints: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: { members: true, columns: { orderBy: { position: "asc" }, include: { cards: { orderBy: { position: "asc" } } } } },
      },
    },
  })
  if (!bonsai) return { error: "Bonsai no encontrado", status: 404 } as const
  const esDueño = bonsai.ownerId === userId
  // Quien no es dueño del Bonsai solo ve los Sprints a los que tiene acceso
  const sprints = bonsai.sprints.filter((s) => esDueño || s.ownerId === userId || s.members.some((m) => m.userId === userId))
  if (sprints.length === 0) return { error: "No tienes acceso a este bonsai", status: 403 } as const
  const hojas = sprints.flatMap((s) =>
    s.columns.flatMap((col) => col.cards.map((c) => ({ ...c, columnName: col.name, sprintName: s.name }))))
  const { ics } = generarIcs(bonsai.name, hojas, urlBase)
  return { ics, nombre: bonsai.name } as const
}

// ¿La persona ve al menos un Sprint de este Bonsai?
export async function tieneAccesoBonsai(bonsaiId: string, userId: string) {
  const b = await prisma.bonsai.findFirst({
    where: {
      id: bonsaiId,
      OR: [
        { ownerId: userId },
        { sprints: { some: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] } } },
      ],
    },
    select: { id: true },
  })
  return !!b
}

// Llave secreta del enlace: 32 caracteres al azar (192 bits)
export const nuevaLlave = () => randomBytes(24).toString("base64url")
