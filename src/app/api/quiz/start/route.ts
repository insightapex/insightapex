import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { MAX_PRACTICE_QUESTIONS } from "@/lib/practice";

const startSchema = z.object({
  paperId: z.string(),
  topicId: z.string().optional(),
  limit: z.number().int().min(1).max(MAX_PRACTICE_QUESTIONS),
  durationSeconds: z.number().int().min(0).max(40 * 60).default(0),
  reviewMode: z.enum(["after_each", "at_end"]).default("at_end"),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const body = await req.json();
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { paperId, topicId, limit, durationSeconds, reviewMode } = parsed.data;
  const maxQuestions = Math.min(limit, MAX_PRACTICE_QUESTIONS);

  const questions = await prisma.question.findMany({
    where: {
      isActive: true,
      topic: {
        paperId,
        ...(topicId ? { id: topicId } : {}),
        isActive: true,
      },
    },
    include: {
      options: { orderBy: { order: "asc" }, select: { id: true, text: true, order: true, isCorrect: true } },
      topic: { select: { id: true, title: true } },
    },
    take: Math.max(maxQuestions * 3, maxQuestions),
  });

  if (questions.length === 0) {
    return NextResponse.json({ error: "No questions available for this selection." }, { status: 404 });
  }

  const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, Math.min(maxQuestions, questions.length));

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId,
      paperId,
      status: "IN_PROGRESS",
      totalQuestions: shuffled.length,
      responses: {
        create: shuffled.map((q: typeof shuffled[0]) => ({
          questionId: q.id,
        })),
      },
    },
  });

  return NextResponse.json({
    attemptId: attempt.id,
    questions: shuffled.map((q: typeof shuffled[0]) => {
      const correctOption = q.options.find((o) => o.isCorrect);
      return {
        id: q.id,
        text: q.text,
        imageUrl: q.imageUrl,
        marks: q.marks,
        topicTitle: q.topic.title,
        options: q.options.map((o) => ({ id: o.id, text: o.text })),
        ...(reviewMode === "after_each"
          ? {
              explanation: q.explanation,
              correctOptionId: correctOption?.id ?? null,
            }
          : {}),
      };
    }),
    durationSeconds,
    reviewMode,
  });
}
