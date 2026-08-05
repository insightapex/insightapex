import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { attemptId: string } }
) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: params.attemptId, status: "SUBMITTED" },
    include: {
      user: { select: { name: true, email: true } },
      paper: { select: { code: true, title: true } },
      responses: {
        include: {
          question: {
            include: {
              subCategory: {
                select: {
                  title: true,
                  category: { select: { title: true } },
                },
              },
              options: { orderBy: { order: "asc" } },
            },
          },
          selectedOption: true,
        },
      },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Result not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: attempt.id,
    studentName: attempt.user.name,
    email: attempt.user.email,
    paper: `${attempt.paper.code} – ${attempt.paper.title}`,
    totalQuestions: attempt.totalQuestions,
    correctCount: attempt.correctCount,
    wrongCount: attempt.wrongCount,
    scorePercent: Math.round(attempt.scorePercent ?? 0),
    passed: attempt.passed,
    submittedAt: attempt.submittedAt,
    durationSec: attempt.durationSec,
    review: attempt.responses.map((response) => {
      const correctOption = response.question.options.find((option) => option.isCorrect);
      const subCategory = response.question.subCategory;
      return {
        questionText: response.question.text,
        categoryTitle: subCategory?.category.title ?? "—",
        subCategoryTitle: subCategory?.title ?? "—",
        selectedOptionText: response.selectedOption?.text ?? null,
        correctOptionText: correctOption?.text ?? null,
        isCorrect: response.isCorrect,
        explanation: response.question.explanation,
      };
    }),
  });
}
