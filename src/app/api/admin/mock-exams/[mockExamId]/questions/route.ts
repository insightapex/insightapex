import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { mockExamQuestionsSchema } from "@/lib/validation/admin-content";

export async function GET(
  req: Request,
  { params }: { params: { mockExamId: string } }
) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mockExam = await prisma.mockExam.findUnique({
    where: { id: params.mockExamId },
    select: { id: true, paperId: true },
  });
  if (!mockExam) return NextResponse.json({ error: "Mock exam not found" }, { status: 404 });

  const url = new URL(req.url);
  const paperId = url.searchParams.get("paperId") ?? mockExam.paperId;
  const topicId = url.searchParams.get("topicId");
  const search = url.searchParams.get("q") ?? "";

  const where: Record<string, unknown> = {
    isActive: true,
    topic: { paperId, isActive: true },
  };
  if (topicId) where.topicId = topicId;
  if (search) where.text = { contains: search, mode: "insensitive" };

  const [selected, available] = await Promise.all([
    prisma.mockExamQuestion.findMany({
      where: { mockExamId: params.mockExamId },
      orderBy: { order: "asc" },
      include: {
        question: {
          include: {
            topic: { select: { title: true, paper: { select: { code: true } } } },
          },
        },
      },
    }),
    prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        topic: { select: { title: true, paper: { select: { code: true } } } },
      },
    }),
  ]);

  const selectedIds = new Set(selected.map((s) => s.questionId));

  return NextResponse.json({
    selected,
    available: available.filter((q) => !selectedIds.has(q.id)),
    totalSelected: selected.length,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: { mockExamId: string } }
) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mockExam = await prisma.mockExam.findUnique({
    where: { id: params.mockExamId },
    select: { id: true, paperId: true, status: true },
  });
  if (!mockExam) return NextResponse.json({ error: "Mock exam not found" }, { status: 404 });

  const body = await req.json();
  const parsed = mockExamQuestionsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const questions = await prisma.question.findMany({
    where: {
      id: { in: parsed.data.questionIds },
      topic: { paperId: mockExam.paperId },
    },
    select: { id: true },
  });

  if (questions.length !== parsed.data.questionIds.length) {
    return NextResponse.json(
      { error: "Some questions are invalid or belong to a different paper." },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.mockExamQuestion.deleteMany({ where: { mockExamId: params.mockExamId } });
    if (parsed.data.questionIds.length > 0) {
      await tx.mockExamQuestion.createMany({
        data: parsed.data.questionIds.map((questionId, index) => ({
          mockExamId: params.mockExamId,
          questionId,
          order: index,
        })),
      });
    }
    if (mockExam.status === "PUBLISHED" && parsed.data.questionIds.length === 0) {
      await tx.mockExam.update({
        where: { id: params.mockExamId },
        data: { status: "DRAFT" },
      });
    }
  });

  const total = await prisma.mockExamQuestion.count({ where: { mockExamId: params.mockExamId } });
  return NextResponse.json({ success: true, totalSelected: total });
}
