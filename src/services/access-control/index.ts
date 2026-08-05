import { prisma } from "@/lib/prisma";
import type { QuestionAccessLevel } from "@/lib/question-access";
import type { QuestionCountBreakdown } from "@/lib/question-access";
import { buildAccessibleCount } from "@/lib/question-access";
import { hasActiveSubscription as checkActiveSubscription } from "@/services/subscription";

async function hasActiveUserAccess(
  userId: string,
  filter: { paperId?: string; mockExamId?: string }
): Promise<boolean> {
  const now = new Date();
  const access = await prisma.userAccess.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      ...(filter.paperId ? { paperId: filter.paperId } : {}),
      ...(filter.mockExamId ? { mockExamId: filter.mockExamId } : {}),
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
  });
  return Boolean(access);
}

async function hasCompletedPurchase(
  userId: string,
  filter: { paperId?: string; mockExamId?: string }
): Promise<boolean> {
  const purchase = await prisma.purchase.findFirst({
    where: {
      userId,
      status: "COMPLETED",
      ...(filter.paperId ? { paperId: filter.paperId } : {}),
      ...(filter.mockExamId ? { mockExamId: filter.mockExamId } : {}),
    },
  });
  return Boolean(purchase);
}

/** Active subscription grant in UserAccess (global, not paper-scoped). */
async function hasActiveSubscriptionUserAccess(userId: string): Promise<boolean> {
  const now = new Date();
  const access = await prisma.userAccess.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      subscriptionId: { not: null },
      paperId: null,
      mockExamId: null,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
  });
  return Boolean(access);
}

function isPremiumContent(accessLevel: string, isPremium: boolean): boolean {
  return accessLevel === "PREMIUM" || isPremium;
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  return checkActiveSubscription(userId);
}

/** Premium subscriber or active global subscription UserAccess. */
export async function hasGlobalPremiumAccess(userId: string): Promise<boolean> {
  if (await checkActiveSubscription(userId)) return true;
  return hasActiveSubscriptionUserAccess(userId);
}

/** Subscription, global subscription access, or one-time paper purchase. */
export async function hasPremiumQuestionAccess(userId: string, paperId: string): Promise<boolean> {
  if (await hasGlobalPremiumAccess(userId)) return true;
  if (await hasActiveUserAccess(userId, { paperId })) return true;
  if (await hasCompletedPurchase(userId, { paperId })) return true;
  return false;
}

export function questionAccessWhere(hasPremiumAccess: boolean) {
  if (hasPremiumAccess) return { purpose: "PRACTICE" as const };
  return { purpose: "PRACTICE" as const, accessLevel: "FREE_TRIAL" as QuestionAccessLevel };
}

export async function getQuestionCounts(
  where: { subCategoryId?: string; subCategory?: { categoryId?: string; category?: { paperId?: string } } },
  hasPremiumAccess: boolean
): Promise<QuestionCountBreakdown> {
  const baseWhere = { isActive: true, purpose: "PRACTICE" as const, ...where };

  const [freeQuestionCount, premiumQuestionCount, totalQuestionCount] = await Promise.all([
    prisma.question.count({ where: { ...baseWhere, accessLevel: "FREE_TRIAL" } }),
    prisma.question.count({ where: { ...baseWhere, accessLevel: "PREMIUM" } }),
    prisma.question.count({ where: baseWhere }),
  ]);

  return {
    freeQuestionCount,
    premiumQuestionCount,
    totalQuestionCount,
    accessibleQuestionCount: buildAccessibleCount(
      { freeQuestionCount, totalQuestionCount },
      hasPremiumAccess
    ),
  };
}

export async function hasPaperAccess(userId: string, paperId: string): Promise<boolean> {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: { accessLevel: true, isPremium: true, isActive: true },
  });
  if (!paper || !paper.isActive) return false;
  if (!isPremiumContent(paper.accessLevel, paper.isPremium)) return true;

  return hasPremiumQuestionAccess(userId, paperId);
}

export async function hasPaperPracticeAccess(userId: string, paperId: string): Promise<boolean> {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: { isActive: true },
  });
  if (!paper?.isActive) return false;

  const hasPremium = await hasPremiumQuestionAccess(userId, paperId);
  const counts = await getQuestionCounts(
    { subCategory: { category: { paperId } } },
    hasPremium
  );
  return counts.accessibleQuestionCount > 0;
}

/**
 * Mock exam access:
 * - FREE (and not premium-flagged): any signed-in student
 * - PREMIUM / paid: premium subscribers, mock buyers, or paper buyers
 */
export async function hasMockExamAccess(userId: string, mockExamId: string): Promise<boolean> {
  const exam = await prisma.mockExam.findUnique({
    where: { id: mockExamId },
    select: {
      paperId: true,
      isActive: true,
      status: true,
      accessLevel: true,
      isPremium: true,
    },
  });
  if (!exam || !exam.isActive || exam.status !== "PUBLISHED") return false;

  const requiresPaid = exam.accessLevel === "PREMIUM" || exam.isPremium;
  if (!requiresPaid) return true;

  if (await hasGlobalPremiumAccess(userId)) return true;
  if (await hasActiveUserAccess(userId, { mockExamId })) return true;
  if (await hasCompletedPurchase(userId, { mockExamId })) return true;
  if (await hasActiveUserAccess(userId, { paperId: exam.paperId })) return true;
  if (await hasCompletedPurchase(userId, { paperId: exam.paperId })) return true;

  return false;
}

export async function canAccessQuestion(userId: string, questionId: string): Promise<boolean> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      subCategory: {
        include: { category: { include: { paper: true } } },
      },
    },
  });
  if (!question?.isActive || question.purpose !== "PRACTICE") return false;
  if (
    !question.subCategory?.isActive ||
    !question.subCategory.category.isActive
  ) {
    return false;
  }

  if (question.accessLevel === "FREE_TRIAL") return true;

  return hasPremiumQuestionAccess(userId, question.subCategory.category.paperId);
}

export async function grantSubscriptionAccess(
  userId: string,
  subscriptionId: string,
  accessType: "MONTHLY_SUBSCRIPTION" | "YEARLY_SUBSCRIPTION",
  _endsAt?: Date | null
) {
  return prisma.userAccess.create({
    data: {
      userId,
      accessType,
      status: "ACTIVE",
      subscriptionId,
      startsAt: new Date(),
      // Keep subscription access open-ended; subscription row governs expiry.
      endsAt: null,
    },
  });
}

export async function grantPurchaseAccess(
  userId: string,
  purchaseId: string,
  accessType: "ONE_TIME_PAPER" | "ONE_TIME_MOCK_EXAM",
  paperId?: string | null,
  mockExamId?: string | null
) {
  return prisma.userAccess.create({
    data: {
      userId,
      accessType,
      status: "ACTIVE",
      purchaseId,
      paperId: paperId ?? null,
      mockExamId: mockExamId ?? null,
      startsAt: new Date(),
    },
  });
}

export async function revokeSubscriptionAccess(subscriptionId: string) {
  await prisma.userAccess.updateMany({
    where: { subscriptionId, status: "ACTIVE" },
    data: { status: "REVOKED", endsAt: new Date() },
  });
}

export async function updateSubscriptionAccessEnd(subscriptionId: string, endsAt: Date | null) {
  // Subscription access stays active while the subscription row is ACTIVE;
  // do not expire UserAccess early based on billing period boundaries.
  await prisma.userAccess.updateMany({
    where: { subscriptionId, status: "ACTIVE" },
    data: { endsAt: null },
  });
}
