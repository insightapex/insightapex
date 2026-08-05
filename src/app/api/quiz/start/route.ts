import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { MAX_PRACTICE_QUESTIONS } from "@/lib/practice";
import { hasGlobalPremiumAccess, hasPremiumQuestionAccess, questionAccessWhere } from "@/services/access-control";
import { getPlatformSettings } from "@/services/platform-settings";

const startSchema = z.object({
  paperId: z.string(),
  subCategoryId: z.string().min(1, "Sub Category is required"),
  limit: z.number().int().min(1).max(MAX_PRACTICE_QUESTIONS),
  /** When omitted, platform defaultTimerMinutes applies. Explicit 0 = untimed. */
  durationSeconds: z.number().int().min(0).max(40 * 60).optional(),
  reviewMode: z.enum(["after_each", "at_end"]).default("at_end"),
});

export async function POST(req: Request) {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.id;
  const body = await req.json();
  const parsed = startSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { paperId, subCategoryId, limit, durationSeconds, reviewMode } = parsed.data;
  const settings = await getPlatformSettings();

  const subCategory = await prisma.subCategory.findFirst({
    where: {
      id: subCategoryId,
      isActive: true,
      category: { paperId, isActive: true },
    },
    include: { category: { select: { title: true } } },
  });

  if (!subCategory) {
    return NextResponse.json({ error: "Sub Category not found for this paper." }, { status: 404 });
  }

  const hasPremium =
    (await hasGlobalPremiumAccess(userId)) ||
    (await hasPremiumQuestionAccess(userId, paperId));
  const accessFilter = questionAccessWhere(hasPremium);

  const maxQuestions = Math.min(limit, MAX_PRACTICE_QUESTIONS);

  const questions = await prisma.question.findMany({
    where: {
      isActive: true,
      subCategoryId,
      ...accessFilter,
    },
    include: {
      options: { orderBy: { order: "asc" }, select: { id: true, text: true, order: true, isCorrect: true } },
      subCategory: {
        select: {
          title: true,
          category: { select: { title: true } },
        },
      },
    },
    take: Math.max(maxQuestions * 3, maxQuestions),
  });

  if (questions.length === 0) {
    return NextResponse.json(
      {
        error: hasPremium
          ? "No questions available for this selection."
          : "No free trial questions available. Upgrade to access premium questions.",
        code: hasPremium ? "NO_QUESTIONS" : "ACCESS_DENIED",
        upgradeUrl: "/dashboard/pricing",
      },
      { status: 404 }
    );
  }

  const ordered = settings.randomiseQuestions
    ? [...questions].sort(() => Math.random() - 0.5)
    : [...questions].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const selected = ordered.slice(0, Math.min(maxQuestions, ordered.length));

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId,
      paperId,
      status: "IN_PROGRESS",
      totalQuestions: selected.length,
      responses: {
        create: selected.map((q) => ({
          questionId: q.id,
        })),
      },
    },
  });

  const resolvedDuration =
    durationSeconds !== undefined
      ? durationSeconds
      : settings.defaultTimerMinutes > 0
        ? settings.defaultTimerMinutes * 60
        : 0;

  return NextResponse.json({
    attemptId: attempt.id,
    questions: selected.map((q) => {
      const options = [...q.options].sort((a, b) => a.order - b.order);
      const correctOptions = options.filter((o) => o.isCorrect);
      return {
        id: q.id,
        text: q.text,
        questionType:
          correctOptions.length > 1 && q.questionType === "SINGLE_CHOICE"
            ? "MULTIPLE_CHOICE"
            : q.questionType,
        imageUrl: q.imageUrl,
        marks: q.marks,
        categoryTitle: q.subCategory?.category.title ?? subCategory.category.title,
        subCategoryTitle: q.subCategory?.title ?? subCategory.title,
        // Always Excel order (A→D by stored order) — do not randomise answers
        options: options.map((o) => ({
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
    durationSeconds: resolvedDuration,
    reviewMode,
    quizSettings: {
      allowPreviousQuestion: settings.allowPreviousQuestion,
      allowQuestionFlagging: settings.allowQuestionFlagging,
      allowDifficultyRating: settings.allowDifficultyRating,
      allowAnswerReview: settings.allowAnswerReview,
      showExplanationAfterCheck: settings.showExplanationAfterCheck,
      allowBookmarks: settings.allowBookmarks,
    },
  });
}
