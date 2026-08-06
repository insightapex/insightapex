/**
 * Subscription lifecycle — active status checks for premium access.
 *
 * Scheduled cancellation (cancelAtPeriodEnd=true) keeps status ACTIVE/TRIALING
 * until Stripe ends the period, so premium continues until currentPeriodEnd.
 */

import { prisma } from "@/lib/prisma";

/**
 * Premium subscription access when:
 * - status is ACTIVE or TRIALING, and
 * - not explicitly ended (endsAt in the past), and
 * - if currentPeriodEnd is set, it has not passed yet.
 *
 * cancelAtPeriodEnd does not end access early (status remains ACTIVE until deleted).
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const now = new Date();
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIALING"] },
      AND: [
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        {
          OR: [
            { currentPeriodEnd: null },
            { currentPeriodEnd: { gt: now } },
            // During the paid period after scheduling cancel, period end is still future.
            // If clocks skew slightly past end before deleted webhook, deny.
          ],
        },
      ],
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
      AND: [
        { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        {
          OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gt: now } }],
        },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: { plan: true },
  });
}
