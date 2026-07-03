import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { hasMockExamAccess } from "@/services/access-control";

export async function POST(_req: Request, { params }: { params: { mockExamId: string } }) {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hasAccess = await hasMockExamAccess(user.id, params.mockExamId);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Upgrade required to start this mock exam.", code: "ACCESS_DENIED", upgradeUrl: "/dashboard/pricing" },
      { status: 403 }
    );
  }

  const mockExam = await prisma.mockExam.findUnique({
    where: { id: params.mockExamId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          question: {
            include: {
              options: { orderBy: { order: "asc" }, select: { id: true, text: true } },
              topic: { select: { title: true } },
            },
          },
        },
      },
    },
  });

  if (!mockExam || !mockExam.isActive || mockExam.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Mock exam not found" }, { status: 404 });
  }

  if (mockExam.questions.length === 0) {
    return NextResponse.json({ error: "This mock exam has no questions." }, { status: 400 });
  }

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: user.id,
      paperId: mockExam.paperId,
      mockExamId: mockExam.id,
      status: "IN_PROGRESS",
      totalQuestions: mockExam.questions.length,
      responses: {
        create: mockExam.questions.map((mq) => ({ questionId: mq.questionId })),
      },
    },
  });

  return NextResponse.json({
    attemptId: attempt.id,
    mockExamId: mockExam.id,
    title: mockExam.title,
    durationMinutes: mockExam.durationMinutes,
    questions: mockExam.questions.map((mq) => ({
      id: mq.question.id,
      text: mq.question.text,
      imageUrl: mq.question.imageUrl,
      marks: mq.question.marks,
      topicTitle: mq.question.topic.title,
      options: mq.question.options,
    })),
  });
}
