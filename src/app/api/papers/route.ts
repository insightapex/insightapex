import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const papers = await prisma.paper.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { topics: true } },
    },
  });

  return NextResponse.json(
    papers.map((p: typeof papers[0]) => ({
      id: p.id,
      code: p.code,
      title: p.title,
      description: p.description,
      accessLevel: p.accessLevel,
      topicCount: p._count.topics,
    }))
  );
}
