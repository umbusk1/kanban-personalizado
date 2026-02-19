import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const [boards, cards, users] = await Promise.all([
    prisma.board.count(),
    prisma.card.count(),
    prisma.user.count(),
  ])
  return NextResponse.json({ boards, cards, users })
}
