import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getPlatformSettings } from "@/services/platform-settings";

/**
 * Load an in-progress mock exam attempt for the student session UI.
 * Correct answers are included for in-session check/explain (same as practice start).
 */
export async function GET(
  _req: Request,
  { params }: { params: { attemptId: string } }
) {
  try {
    const user = await requireAuthApi();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: params.attemptId },
      include: {
        mockExam: {
          select: {
            id: true,
            title: true,
            durationMinutes: true,
            passMarkPercent: true,
            status: true,
            isActive: true,
          },
        },
        paper: { select: { id: true, code: true, title: true } },
        responses: {
          orderBy: { id: "asc" },
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

    if (!attempt || attempt.userId !== user.id) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (!attempt.mockExamId || !attempt.mockExam) {
      return NextResponse.json(
        { error: "This attempt is not a mock exam session." },
        { status: 400 }
      );
    }

    if (attempt.status === "SUBMITTED") {
      return NextResponse.json({
        status: "SUBMITTED",
        attemptId: attempt.id,
        redirectUrl: `/dashboard/quiz/result?attemptId=${attempt.id}&mockExam=1`,
      });
    }

    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "This mock exam attempt is no longer in progress." },
        { status: 409 }
      );
    }

    // Preserve mock exam order when available
    const linkOrder = await prisma.mockExamQuestion.findMany({
      where: { mockExamId: attempt.mockExamId },
      orderBy: { order: "asc" },
      select: { questionId: true, order: true },
    });
    const orderMap = new Map(linkOrder.map((l) => [l.questionId, l.order]));
    const orderedResponses = [...attempt.responses].sort((a, b) => {
      const ao = orderMap.get(a.questionId) ?? 9999;
      const bo = orderMap.get(b.questionId) ?? 9999;
      if (ao !== bo) return ao - bo;
      return a.id.localeCompare(b.id);
    });

    const settings = await getPlatformSettings();

    return NextResponse.json({
      status: "IN_PROGRESS",
      attemptId: attempt.id,
      mockExamId: attempt.mockExam.id,
      title: attempt.mockExam.title,
      paper: attempt.paper,
      durationMinutes: attempt.mockExam.durationMinutes,
      durationSeconds: attempt.mockExam.durationMinutes * 60,
      passMarkPercent: attempt.mockExam.passMarkPercent,
      totalQuestions: attempt.totalQuestions,
      startedAt: attempt.startedAt,
      questions: orderedResponses.map((r) => {
        const q = r.question;
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
          categoryTitle: q.subCategory?.category.title ?? attempt.mockExam!.title,
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
    console.error("[mock-exams/attempts]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not load mock exam session.",
      },
      { status: 500 }
    );
  }
}
