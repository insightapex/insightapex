/**
 * Subscription lifecycle — active status checks for premium access.
 */

import { prisma } from "@/lib/prisma";

/**
 * A subscription counts as active when status is ACTIVE/TRIALING and it has not
 * been explicitly ended. We intentionally do NOT deny access based on
 * currentPeriodEnd alone — Stripe may still show ACTIVE while renewing.
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const now = new Date();
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIALING"] },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { updatedAt: "desc" },
  });
  return Boolean(sub);
}

export async function getActiveSubscription(userId: string) {
  const now = new Date();
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIALING"] },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
    orderBy: { updatedAt: "desc" },
    include: { plan: true },
  });
}
