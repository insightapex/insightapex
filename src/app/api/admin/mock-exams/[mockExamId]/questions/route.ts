import { NextResponse } from "next/server";
import { requireContentEditorApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { adminMockExamQuestionSchema } from "@/lib/validation/admin-question";
import { mockExamQuestionsSchema } from "@/lib/validation/admin-content";

/** List / manage MOCK_EXAM questions for one mock exam (not the practice pool). */
export async function GET(
  _req: Request,
  { params }: { params: { mockExamId: string } }
) {
  if (!(await requireContentEditorApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mockExam = await prisma.mockExam.findUnique({
    where: { id: params.mockExamId },
    select: { id: true, paperId: true, title: true, status: true },
  });
  if (!mockExam) return NextResponse.json({ error: "Mock exam not found" }, { status: 404 });

  const selected = await prisma.mockExamQuestion.findMany({
    where: {
      mockExamId: params.mockExamId,
      question: { purpose: "MOCK_EXAM" },
    },
    orderBy: { order: "asc" },
    include: {
      question: {
        include: {
          options: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  return NextResponse.json({
    mockExam,
    selected,
    totalSelected: selected.length,
  });
}

/** Create a new MOCK_EXAM question and append it to this mock exam set. */
export async function POST(
  req: Request,
  { params }: { params: { mockExamId: string } }
) {
  if (!(await requireContentEditorApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mockExam = await prisma.mockExam.findUnique({
    where: { id: params.mockExamId },
    select: { id: true },
  });
  if (!mockExam) return NextResponse.json({ error: "Mock exam not found" }, { status: 404 });

  const body = await req.json();
  const parsed = adminMockExamQuestionSchema.safeParse({ ...body, purpose: "MOCK_EXAM" });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { options, purpose: _purpose, ...rest } = parsed.data;
  const maxOrder = await prisma.mockExamQuestion.aggregate({
    where: { mockExamId: params.mockExamId },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const link = await prisma.$transaction(async (tx) => {
    const question = await tx.question.create({
      data: {
        ...rest,
        purpose: "MOCK_EXAM",
        subCategoryId: null,
        options: { create: options },
      },
    });
    return tx.mockExamQuestion.create({
      data: {
        mockExamId: params.mockExamId,
        questionId: question.id,
        order: nextOrder,
      },
      include: {
        question: {
          include: { options: { orderBy: { order: "asc" } } },
        },
      },
    });
  });

  return NextResponse.json(link, { status: 201 });
}

/** Reorder existing MOCK_EXAM questions for this exam (fixed set order). */
export async function PUT(
  req: Request,
  { params }: { params: { mockExamId: string } }
) {
  if (!(await requireContentEditorApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mockExam = await prisma.mockExam.findUnique({
    where: { id: params.mockExamId },
    select: { id: true, status: true },
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
      purpose: "MOCK_EXAM",
      mockExamLinks: { some: { mockExamId: params.mockExamId } },
    },
    select: { id: true },
  });

  if (questions.length !== parsed.data.questionIds.length) {
    return NextResponse.json(
      {
        error:
          "Some questions are invalid. Mock exams can only use MOCK_EXAM questions assigned to this exam.",
      },
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
