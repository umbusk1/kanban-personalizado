import { createHmac, timingSafeEqual } from "crypto"

// Pase que llega desde Compita al pulsar "Ir a KanbanBonsai".
// Es un JWT firmado por Compita con HS256. KanbanBonsai solo lo acepta si
// la firma coincide con el secreto compartido COMPITA_JWT_SECRET (el mismo
// valor que Compita usa para firmar) y si el pase no está vencido.

export type CompitaClaims = {
  email:     string
  empresaId: number
  userId?:   number
  rol?:      string
  plan?:     string
  exp:       number
  iat?:      number
}

function base64UrlDecode(segment: string): Buffer {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4)
  return Buffer.from(padded, "base64")
}

/**
 * Verifica el pase de Compita. Devuelve los datos si es auténtico y vigente;
 * si no, devuelve null. Nunca acepta un pase sin firma válida.
 */
export function verifyCompitaToken(token: string): CompitaClaims | null {
  const secret = process.env.COMPITA_JWT_SECRET
  if (!secret) {
    // Sin secreto configurado no hay forma de comprobar el pase: se rechaza.
    console.error("COMPITA_JWT_SECRET no está configurado; se rechaza el login con Compita")
    return null
  }

  const parts = token.split(".")
  if (parts.length !== 3) return null
  const [headerB64, payloadB64, signatureB64] = parts

  let header: { alg?: string; typ?: string }
  let claims: Partial<CompitaClaims>
  try {
    header = JSON.parse(base64UrlDecode(headerB64).toString("utf-8"))
    claims = JSON.parse(base64UrlDecode(payloadB64).toString("utf-8"))
  } catch {
    return null
  }

  // Solo se acepta el algoritmo que usa Compita.
  if (header.alg !== "HS256") return null

  const expected = createHmac("sha256", secret).update(`${headerB64}.${payloadB64}`).digest()
  const given    = base64UrlDecode(signatureB64)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

  // Debe tener vencimiento y no estar vencido.
  const now = Math.floor(Date.now() / 1000)
  if (typeof claims.exp !== "number" || claims.exp <= now) return null
  if (typeof claims.iat === "number" && claims.iat > now + 60) return null

  if (typeof claims.email !== "string" || !claims.email.includes("@")) return null
  if (typeof claims.empresaId !== "number") return null

  return {
    ...claims,
    email: claims.email.trim(),
  } as CompitaClaims
}
