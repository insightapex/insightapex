import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { topicSchema } from "@/lib/validation/admin-content";

export async function GET(req: Request) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const paperId = url.searchParams.get("paperId");
  const search = url.searchParams.get("q") ?? "";

  const where: Record<string, unknown> = {};
  if (paperId) where.paperId = paperId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const topics = await prisma.topic.findMany({
    where,
    orderBy: [{ order: "asc" }, { title: "asc" }],
    include: {
      paper: { select: { id: true, code: true, title: true } },
      _count: { select: { questions: true } },
    },
  });

  return NextResponse.json({ topics, total: topics.length });
}

export async function POST(req: Request) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = topicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const topic = await prisma.topic.create({
    data: parsed.data,
    include: {
      paper: { select: { id: true, code: true, title: true } },
      _count: { select: { questions: true } },
    },
  });

  return NextResponse.json(topic, { status: 201 });
}
