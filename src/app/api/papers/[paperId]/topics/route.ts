import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { paperId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const mapped = topics.map((t: typeof topics[0]) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    questionCount: t._count.questions,
  }));

  return NextResponse.json(mapped);
}
