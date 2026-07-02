import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const url = new URL(req.url);
  const attemptId = url.searchParams.get("attemptId");
  if (!attemptId) return NextResponse.json({ error: "attemptId required" }, { status: 400 });

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      paper: { select: { code: true, title: true } },
      responses: {
        include: {
          question: {
            include: {
              topic: { select: { id: true, title: true } },
              options: { orderBy: { order: "asc" } },
            },
          },
          selectedOption: true,
        },
      },
    },
  });

  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Build topic breakdown
  const topicMap: Record<string, { title: string; correct: number; total: number }> = {};
  for (const r of attempt.responses) {
    const tid: string = r.question.topic.id;
    if (!topicMap[tid]) topicMap[tid] = { title: r.question.topic.title, correct: 0, total: 0 };
    topicMap[tid].total++;
    if (r.isCorrect) topicMap[tid].correct++;
  }

  const topicBreakdown = Object.entries(topicMap).map(([topicId, t]) => ({
    topicId,
    topicTitle: t.title,
    total: t.total,
    correct: t.correct,
    percent: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
  }));

  const weakTopics = topicBreakdown.filter((t) => t.percent < 60).map((t) => t.topicTitle);

  return NextResponse.json({
    attemptId: attempt.id,
    paper: `${attempt.paper.code} – ${attempt.paper.title}`,
    totalQuestions: attempt.totalQuestions,
    correctCount: attempt.correctCount,
    wrongCount: attempt.wrongCount,
    scorePercent: Math.round(attempt.scorePercent ?? 0),
    passed: attempt.passed,
    submittedAt: attempt.submittedAt,
    durationSec: attempt.durationSec,
    topicBreakdown,
    weakTopics,
    // Full review: each question with selected answer, correct answer, explanation
    review: attempt.responses.map((r: typeof attempt.responses[0]) => {
      const correctOption = r.question.options.find((o: { isCorrect: boolean }) => o.isCorrect);
      return {
        questionId: r.questionId,
        questionText: r.question.text,
        imageUrl: r.question.imageUrl,
        topicTitle: r.question.topic.title,
        difficulty: r.question.difficulty,
        selectedOptionId: r.selectedOptionId,
        selectedOptionText: r.selectedOption?.text ?? null,
        correctOptionId: correctOption?.id ?? null,
        correctOptionText: correctOption?.text ?? null,
        isCorrect: r.isCorrect,
        explanation: r.question.explanation,
        options: r.question.options.map((o: { id: string; text: string; isCorrect: boolean }) => ({
          id: o.id, text: o.text, isCorrect: o.isCorrect,
        })),
      };
    }),
  });
}
