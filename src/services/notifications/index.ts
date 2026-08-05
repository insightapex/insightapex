import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  href?: string | null;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      href: input.href ?? null,
    },
  });
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function listNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const result = await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count > 0;
}

export async function markAllNotificationsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return result.count;
}

export async function notifyQuizResult(params: {
  userId: string;
  attemptId: string;
  paperCode: string;
  paperTitle: string;
  scorePercent: number;
  passed: boolean;
  isMockExam?: boolean;
  mockExamTitle?: string | null;
}) {
  const label = params.isMockExam && params.mockExamTitle
    ? params.mockExamTitle
    : `${params.paperCode} — ${params.paperTitle}`;
  const score = Math.round(params.scorePercent);

  return createNotification({
    userId: params.userId,
    type: "QUIZ_RESULT",
    title: params.passed ? `Passed — ${score}%` : `Quiz complete — ${score}%`,
    message: params.passed
      ? `Great work! You passed ${label} with ${score}%.`
      : `You scored ${score}% on ${label}. Review your answers to improve.`,
    href: `/dashboard/quiz/result?attemptId=${params.attemptId}`,
  });
}

export async function notifySubscriptionActivated(params: {
  userId: string;
  planName: string;
}) {
  return createNotification({
    userId: params.userId,
    type: "BILLING",
    title: "Premium activated",
    message: `Your ${params.planName} subscription is now active. Enjoy full access!`,
    href: "/dashboard/billing",
  });
}

export async function notifyPurchaseCompleted(params: {
  userId: string;
  productName: string;
}) {
  return createNotification({
    userId: params.userId,
    type: "BILLING",
    title: "Purchase confirmed",
    message: `${params.productName} has been added to your account.`,
    href: "/dashboard/billing",
  });
}
