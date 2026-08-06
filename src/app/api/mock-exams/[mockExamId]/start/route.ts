import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { hasMockExamAccess } from "@/services/access-control";
import { getPlatformSettings } from "@/services/platform-settings";

export async function POST(_req: Request, { params }: { params: { mockExamId: string } }) {
  try {
    const user = await requireAuthApi();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const hasAccess = await hasMockExamAccess(user.id, params.mockExamId);
    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "Upgrade required to start this mock exam.",
          code: "ACCESS_DENIED",
          upgradeUrl: "/dashboard/pricing",
        },
        { status: 403 }
      );
    }

    const mockExam = await prisma.mockExam.findUnique({
      where: { id: params.mockExamId },
      include: {
        questions: {
          where: { question: { isActive: true } },
          orderBy: { order: "asc" },
          include: {
            question: {
              include: {
                options: {
                  orderBy: { order: "asc" },
                  select: { id: true, text: true, isCorrect: true, order: true },
                },
                subCategory: {
                  select: {
                    title: true,
                    category: { select: { title: true } },
                  },
                },
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

    // Filter MOCK_EXAM purpose via SQL so this works even if Prisma Client
    // has not been regenerated yet after the purpose migration.
    const linkedIds = mockExam.questions.map((mq) => mq.questionId);
    const mockPurposeRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Question"
      WHERE purpose = CAST('MOCK_EXAM' AS "QuestionPurpose")
        AND id IN (${Prisma.join(linkedIds)})
    `;
    const mockPurposeIds = new Set(mockPurposeRows.map((row) => row.id));
    const examQuestions = mockExam.questions.filter((mq) => mockPurposeIds.has(mq.questionId));

    if (examQuestions.length === 0) {
      return NextResponse.json(
        {
          error:
            "This mock exam has no MOCK_EXAM questions yet. Add questions in Admin → Mock Exams → Manage Questions.",
        },
        { status: 400 }
      );
    }

    const settings = await getPlatformSettings();

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId: user.id,
        paperId: mockExam.paperId,
        mockExamId: mockExam.id,
        status: "IN_PROGRESS",
        totalQuestions: examQuestions.length,
        responses: {
          create: examQuestions.map((mq) => ({ questionId: mq.questionId })),
        },
      },
    });

    return NextResponse.json({
      attemptId: attempt.id,
      mockExamId: mockExam.id,
      title: mockExam.title,
      durationMinutes: mockExam.durationMinutes,
      durationSeconds: mockExam.durationMinutes * 60,
      questions: examQuestions.map((mq) => {
        const q = mq.question;
        const correctOptions = q.options.filter((o) => o.isCorrect);
        return {
          id: q.id,
          text: q.text,
          questionType:
            correctOptions.length > 1 && q.questionType === "SINGLE_CHOICE"
              ? "MULTIPLE_CHOICE"
              : q.questionType,
          imageUrl: q.imageUrl,
          marks: q.marks,
          categoryTitle: q.subCategory?.category.title ?? mockExam.title,
          subCategoryTitle: q.subCategory?.title ?? "Mock exam",
          options: q.options.map((o) => ({
            id: o.id,
            text: o.text,
            order: o.order,
            label: (["A", "B", "C", "D"] as const)[o.order] ?? String(o.order + 1),
          })),
          explanation: q.explanation,
          explanationMy: q.explanationMy,
          correctOptionId: correctOptions[0]?.id ?? null,
          correctOptionIds: correctOptions.map((o) => o.id),
        };
      }),
      quizSettings: {
        allowPreviousQuestion: settings.allowPreviousQuestion,
        allowQuestionFlagging: settings.allowQuestionFlagging,
        // Mock exams: hide check-answer, difficulty rating, and mid-test explanations
        allowDifficultyRating: false,
        allowAnswerReview: false,
        showExplanationAfterCheck: false,
        allowBookmarks: settings.allowBookmarks,
      },
    });
  } catch (err) {
    console.error("[mock-exams/start]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not start mock exam. Restart the dev server and run npx prisma generate.",
      },
      { status: 500 }
    );
  }
}
