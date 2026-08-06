/**
 * Stripe subscription lifecycle — cancel / resume at period end.
 * Only the authenticated owner can cancel; browser-supplied IDs are never trusted.
 */

import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { applyStripeSubscriptionSnapshot } from "./stripe-subscription-sync";

export type ManagedSubscriptionResult = {
  alreadyScheduled: boolean;
  subscription: {
    id: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelledAt: string | null;
    endsAt: string | null;
  };
};

function serializeSub(sub: {
  id: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
  endsAt: Date | null;
}): ManagedSubscriptionResult["subscription"] {
  return {
    id: sub.id,
    status: sub.status,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    currentPeriodStart: sub.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    cancelledAt: sub.cancelledAt?.toISOString() ?? null,
    endsAt: sub.endsAt?.toISOString() ?? null,
  };
}

/**
 * Active Stripe-backed subscription for billing management.
 * Ownership is enforced by userId from the session.
 */
export async function getManagedStripeSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIALING"] },
      stripeSubscriptionId: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    include: { plan: true },
  });
}

export async function cancelSubscriptionAtPeriodEnd(
  userId: string
): Promise<ManagedSubscriptionResult> {
  const dbSub = await getManagedStripeSubscription(userId);
  if (!dbSub?.stripeSubscriptionId) {
    throw new Error("No active subscription to cancel.");
  }

  // Idempotent: already scheduled → no Stripe call needed (unless we want sync).
  if (dbSub.cancelAtPeriodEnd) {
    return { alreadyScheduled: true, subscription: serializeSub(dbSub) };
  }

  const stripe = getStripe();
  let stripeSub: Stripe.Subscription;
  try {
    stripeSub = await stripe.subscriptions.update(dbSub.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe cancellation failed";
    throw new Error(message);
  }

  // Security: never apply updates for another local row.
  if (stripeSub.id !== dbSub.stripeSubscriptionId) {
    throw new Error("Stripe subscription mismatch.");
  }

  const updated = await applyStripeSubscriptionSnapshot(stripeSub, {
    expectedUserId: userId,
    existingLocalId: dbSub.id,
  });

  if (!updated) {
    throw new Error("Could not update local subscription after cancellation.");
  }

  const refreshed = await prisma.subscription.findUnique({ where: { id: updated.id } });
  if (!refreshed || refreshed.userId !== userId) {
    throw new Error("Subscription ownership could not be verified after cancellation.");
  }

  return { alreadyScheduled: false, subscription: serializeSub(refreshed) };
}

export async function resumeSubscriptionAtPeriodEnd(
  userId: string
): Promise<ManagedSubscriptionResult> {
  const dbSub = await getManagedStripeSubscription(userId);
  if (!dbSub?.stripeSubscriptionId) {
    throw new Error("No active subscription to resume.");
  }

  if (!dbSub.cancelAtPeriodEnd) {
    return { alreadyScheduled: false, subscription: serializeSub(dbSub) };
  }

  const stripe = getStripe();
  let stripeSub: Stripe.Subscription;
  try {
    stripeSub = await stripe.subscriptions.update(dbSub.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe resume failed";
    throw new Error(message);
  }

  if (stripeSub.id !== dbSub.stripeSubscriptionId) {
    throw new Error("Stripe subscription mismatch.");
  }

  const updated = await applyStripeSubscriptionSnapshot(stripeSub, {
    expectedUserId: userId,
    existingLocalId: dbSub.id,
  });

  if (!updated) {
    throw new Error("Could not update local subscription after resume.");
  }

  const refreshed = await prisma.subscription.findUnique({ where: { id: updated.id } });
  if (!refreshed || refreshed.userId !== userId) {
    throw new Error("Subscription ownership could not be verified after resume.");
  }

  return { alreadyScheduled: true, subscription: serializeSub(refreshed) };
}
