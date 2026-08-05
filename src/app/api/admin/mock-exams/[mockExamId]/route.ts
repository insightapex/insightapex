import { NextResponse } from "next/server";
import { requireContentEditorApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { mockExamSchema, mockExamTitleFromPaper } from "@/lib/validation/admin-content";

async function validatePublish(mockExamId: string, status: string) {
  if (status !== "PUBLISHED") return null;
  const count = await prisma.mockExamQuestion.count({ where: { mockExamId } });
  if (count === 0) {
    return "Cannot publish a mock exam with 0 questions.";
  }
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: { mockExamId: string } }
) {
  if (!(await requireContentEditorApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mockExam = await prisma.mockExam.findUnique({
    where: { id: params.mockExamId },
    include: {
      paper: {
        select: {
          id: true,
          code: true,
          title: true,
          partId: true,
          part: { select: { id: true, code: true, title: true } },
        },
      },
      questions: {
        orderBy: { order: "asc" },
        include: {
          question: {
            include: {
              subCategory: {
                include: {
                  category: { include: { paper: { select: { code: true } } } },
                },
              },
              options: {
                orderBy: { order: "asc" },
                select: { id: true, text: true, isCorrect: true },
              },
            },
          },
        },
      },
      _count: { select: { questions: true } },
    },
  });

  if (!mockExam) return NextResponse.json({ error: "Mock exam not found" }, { status: 404 });
  return NextResponse.json(mockExam);
}

export async function PATCH(
  req: Request,
  { params }: { params: { mockExamId: string } }
) {
  if (!(await requireContentEditorApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.mockExam.findUnique({ where: { id: params.mockExamId } });
  if (!existing) return NextResponse.json({ error: "Mock exam not found" }, { status: 404 });

  const body = await req.json();
  const parsed = mockExamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const publishError = await validatePublish(params.mockExamId, parsed.data.status);
  if (publishError) {
    return NextResponse.json({ error: publishError }, { status: 400 });
  }

  const paper = await prisma.paper.findUnique({
    where: { id: parsed.data.paperId },
    select: { id: true, code: true },
  });
  if (!paper) {
    return NextResponse.json({ error: "Paper not found." }, { status: 400 });
  }

  const { title: titleInput, ...rest } = parsed.data;
  const paperChanged = parsed.data.paperId !== existing.paperId;
  const title =
    titleInput?.trim() ||
    (paperChanged ? mockExamTitleFromPaper(paper.code) : existing.title);

  const mockExam = await prisma.mockExam.update({
    where: { id: params.mockExamId },
    data: {
      ...rest,
      title,
    },
    include: {
      paper: {
        select: {
          id: true,
          code: true,
          title: true,
          partId: true,
          part: { select: { id: true, code: true, title: true } },
        },
      },
      _count: { select: { questions: true } },
    },
  });

  return NextResponse.json(mockExam);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { mockExamId: string } }
) {
  if (!(await requireContentEditorApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.mockExam.findUnique({ where: { id: params.mockExamId } });
  if (!existing) return NextResponse.json({ error: "Mock exam not found" }, { status: 404 });

  await prisma.mockExam.delete({ where: { id: params.mockExamId } });
  return NextResponse.json({ success: true });
}
