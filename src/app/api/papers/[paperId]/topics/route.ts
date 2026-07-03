import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { hasPaperAccess } from "@/services/access-control";

export async function GET(_req: Request, { params }: { params: { paperId: string } }) {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await hasPaperAccess(user.id, params.paperId);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Upgrade required to access this paper.", code: "ACCESS_DENIED", upgradeUrl: "/dashboard/pricing" },
      { status: 403 }
    );
  }

  const topics = await prisma.topic.findMany({
    where: { paperId: params.paperId, isActive: true },
    orderBy: { order: "asc" },
    include: {
      _count: {
        select: {
          questions: { where: { isActive: true } },
        },
      },
    },
  });

  const mapped = topics.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    questionCount: t._count.questions,
  }));

  return NextResponse.json(mapped);
}
