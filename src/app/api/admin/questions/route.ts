import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminQuestionSchema } from "@/lib/validation/admin-question";

const isAdmin = async () => {
  const s = await getServerSession(authOptions);
  return s?.user && (s.user as any).role === "ADMIN";
};

export async function GET(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const paperId = url.searchParams.get("paperId");
  const topicId = url.searchParams.get("topicId");
  const search = url.searchParams.get("q") ?? "";
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const pageSize = 25;

  const where: Record<string, unknown> = {};
  if (topicId) where.topicId = topicId;
  else if (paperId) where.topic = { paperId };
  if (search) where.text = { contains: search, mode: "insensitive" };

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        topic: { include: { paper: { select: { code: true } } } },
        options: { orderBy: { order: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.question.count({ where }),
  ]);

  return NextResponse.json({ questions, total, page, pageSize });
}

const questionSchema = adminQuestionSchema;

export async function POST(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = questionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { options, ...rest } = parsed.data;
  const question = await prisma.question.create({
    data: {
      ...rest,
      options: { create: options },
    },
    include: { options: true },
  });

  return NextResponse.json(question, { status: 201 });
}
