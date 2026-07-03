/**
 * Access control — checks subscriptions, purchases, and admin grants.
 */

import { prisma } from "@/lib/prisma";
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

function isPremiumContent(accessLevel: string, isPremium: boolean): boolean {
  return accessLevel === "PREMIUM" || isPremium;
}

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  return checkActiveSubscription(userId);
}

export async function hasPaperAccess(userId: string, paperId: string): Promise<boolean> {
  const paper = await prisma.paper.findUnique({
    where: { id: paperId },
    select: { accessLevel: true, isPremium: true, isActive: true },
  });
  if (!paper || !paper.isActive) return false;
  if (!isPremiumContent(paper.accessLevel, paper.isPremium)) return true;

  if (await hasActiveSubscription(userId)) return true;
  if (await hasActiveUserAccess(userId, { paperId })) return true;
  if (await hasCompletedPurchase(userId, { paperId })) return true;

  return false;
}

export async function hasMockExamAccess(userId: string, mockExamId: string): Promise<boolean> {
  const exam = await prisma.mockExam.findUnique({
    where: { id: mockExamId },
    select: { accessLevel: true, isPremium: true, isActive: true, status: true },
  });
  if (!exam || !exam.isActive || exam.status !== "PUBLISHED") return false;
  if (!isPremiumContent(exam.accessLevel, exam.isPremium)) return true;

  if (await hasActiveSubscription(userId)) return true;
  if (await hasActiveUserAccess(userId, { mockExamId })) return true;
  if (await hasCompletedPurchase(userId, { mockExamId })) return true;

  return false;
}

export async function canAccessQuestion(userId: string, questionId: string): Promise<boolean> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { topic: { include: { paper: true } } },
  });
  if (!question?.isActive || !question.topic.isActive) return false;
  return hasPaperAccess(userId, question.topic.paperId);
}

export async function grantSubscriptionAccess(
  userId: string,
  subscriptionId: string,
  accessType: "MONTHLY_SUBSCRIPTION" | "YEARLY_SUBSCRIPTION",
  endsAt?: Date | null
) {
  await prisma.userAccess.create({
    data: {
      userId,
      accessType,
      status: "ACTIVE",
      subscriptionId,
      startsAt: new Date(),
      endsAt: endsAt ?? null,
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
  await prisma.userAccess.create({
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
  await prisma.userAccess.updateMany({
    where: { subscriptionId, status: "ACTIVE" },
    data: { endsAt },
  });
}
