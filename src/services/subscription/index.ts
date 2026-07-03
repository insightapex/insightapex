/**
 * Subscription lifecycle placeholder — Phase 2.
 */

import { prisma } from "@/lib/prisma";

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const now = new Date();
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIALING"] },
      OR: [
        { endsAt: null, currentPeriodEnd: null },
        { endsAt: null, currentPeriodEnd: { gt: now } },
        { endsAt: { gt: now } },
      ],
    },
  });
  return Boolean(sub);
}

export async function getActiveSubscription(userId: string) {
  const now = new Date();
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIALING"] },
      OR: [
        { endsAt: null, currentPeriodEnd: null },
        { endsAt: null, currentPeriodEnd: { gt: now } },
        { endsAt: { gt: now } },
      ],
    },
    include: { plan: true },
  });
}
