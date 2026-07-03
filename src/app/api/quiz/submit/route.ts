import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const submitSchema = z.object({
  attemptId: z.string(),
  answers: z.array(
    z.object({
      questionId: z.string(),
      selectedOptionId: z.string().nullable(),
    })
  ),
  durationSec: z.number().optional(),
});

const PASS_THRESHOLD = 50; // 50% to pass

export async function POST(req: Request) {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.id;
  const body = await req.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission data" }, { status: 400 });

  const { attemptId, answers, durationSec } = parsed.data;

  // Verify attempt belongs to this user
  const attempt = await prisma.quizAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.userId !== userId) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json({ error: "This attempt has already been submitted" }, { status: 409 });
  }

  // Grade each answer
  let correctCount = 0;
  const updates = [];

  for (const ans of answers) {
    let isCorrect = false;
    if (ans.selectedOptionId) {
      const option = await prisma.answerOption.findUnique({
        where: { id: ans.selectedOptionId },
        select: { isCorrect: true },
      });
      isCorrect = option?.isCorrect ?? false;
    }

    if (isCorrect) correctCount++;

    updates.push(
      prisma.questionResponse.updateMany({
        where: { attemptId, questionId: ans.questionId },
        data: {
          selectedOptionId: ans.selectedOptionId,
          isCorrect,
          answeredAt: new Date(),
        },
      })
    );
  }

  await Promise.all(updates);

  const total = attempt.totalQuestions;
  const wrong = total - correctCount;
  const scorePercent = total > 0 ? (correctCount / total) * 100 : 0;
  const passed = scorePercent >= PASS_THRESHOLD;

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

  return NextResponse.json({ attemptId, scorePercent, passed, correctCount, wrongCount: wrong });
}
