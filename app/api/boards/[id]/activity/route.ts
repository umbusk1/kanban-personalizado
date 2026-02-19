import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const logs = await prisma.activityLog.findMany({
    where: { boardId: params.id },
    orderBy: { createdAt: "desc" },
    take: 15,
    include: { user: { select: { name: true, email: true } } },
  })

  return NextResponse.json(logs)
}
