import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { hasPaperAccess } from "@/services/access-control";

export async function GET() {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const papers = await prisma.paper.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { topics: true } },
    },
  });

  const accessResults = await Promise.all(
    papers.map(async (p) => ({
      paper: p,
      hasAccess: await hasPaperAccess(user.id, p.id),
    }))
  );

  return NextResponse.json(
    accessResults.map(({ paper: p, hasAccess }) => ({
      id: p.id,
      code: p.code,
      title: p.title,
      description: p.description,
      accessLevel: p.accessLevel,
      isPremium: p.isPremium,
      hasAccess,
      isLocked: !hasAccess,
      topicCount: p._count.topics,
    }))
  );
}
