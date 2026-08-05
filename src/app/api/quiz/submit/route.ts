import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notifyQuizResult } from "@/services/notifications";
import { getPlatformSettings } from "@/services/platform-settings";
import { gradeQuestionAnswer, loadQuestionsForGrading } from "@/lib/quiz-grading";
import { z } from "zod";

const submitSchema = z.object({
  attemptId: z.string(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOptionId: z.string().nullable(),
      selectedOptionIds: z.array(z.string()).optional(),
    })
  ),
  durationSec: z.number().optional(),
});


export async function POST(req: Request) {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.id;
  const body = await req.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission data" }, { status: 400 });

  const { attemptId, answers, durationSec } = parsed.data;

  // Verify attempt belongs to this user
  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      paper: { select: { code: true, title: true } },
      mockExam: { select: { title: true } },
    },
  });
  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "This attempt has already been submitted" }, { status: 409 });
  }

  // Grade each answer
  let correctCount = 0;
  const updates = [];
  const questionMap = new Map(
    (await loadQuestionsForGrading(answers.map((answer) => answer.questionId))).map((question) => [
      question.id,
      question,
    ])
  );

  for (const ans of answers) {
    const question = questionMap.get(ans.questionId);
    const selectedOptionIds = ans.selectedOptionIds ?? [];
    const isCorrect = question
      ? gradeQuestionAnswer({
          questionType: question.questionType,
          options: question.options,
          selectedOptionId: ans.selectedOptionId,
          selectedOptionIds,
        })
      : false;

    if (isCorrect) correctCount++;

    updates.push(
      prisma.questionResponse.updateMany({
        where: { attemptId, questionId: ans.questionId },
        data: {
          selectedOptionId: ans.selectedOptionId,
          selectedOptionIds,
          isCorrect,
          answeredAt: new Date(),
        },
      })
    );
  }

  await Promise.all(updates);

  const settings = await getPlatformSettings();
  const passThreshold = settings.defaultPassMark;

  const total = attempt.totalQuestions;
  const wrong = total - correctCount;
  let scorePercent = total > 0 ? (correctCount / total) * 100 : 0;
  if (settings.enableNegativeMarking) {
    const net = correctCount - wrong * 0.25;
    scorePercent = total > 0 ? Math.max(0, (net / total) * 100) : 0;
  }
  const passed = scorePercent >= passThreshold;

  await prisma.quizAttempt.update({
    where: { id: attemptId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      durationSec,
      correctCount,
      wrongCount: wrong,
      scorePercent,
      passed,
    },
  });

  try {
    await notifyQuizResult({
      userId,
      attemptId,
      paperCode: attempt.paper.code,
      paperTitle: attempt.paper.title,
      scorePercent,
      passed,
      isMockExam: Boolean(attempt.mockExamId),
      mockExamTitle: attempt.mockExam?.title ?? null,
    });
  } catch (notifyError) {
    console.error("[api/quiz/submit] notification", notifyError);
  }

  return NextResponse.json({ attemptId, scorePercent, passed, correctCount, wrongCount: wrong });
}
