/**
 * Maps a Stripe Subscription object onto the local Prisma Subscription row.
 * Used by webhooks and cancel/resume APIs — keeps period and cancel flags consistent.
 */

import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import {
  grantSubscriptionAccess,
  revokeSubscriptionAccess,
  updateSubscriptionAccessEnd,
} from "@/services/access-control";
import { logWebhookDev, logWebhookError } from "./webhook-logger";

export type LocalSubRef = { id: string; userId: string };

export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const item = subscription.items?.data?.[0];
  if (item?.current_period_end) {
    return new Date(item.current_period_end * 1000);
  }
  const legacy = subscription as Stripe.Subscription & { current_period_end?: number };
  if (legacy.current_period_end) {
    return new Date(legacy.current_period_end * 1000);
  }
  if (subscription.cancel_at) {
    return new Date(subscription.cancel_at * 1000);
  }
  return null;
}

export function getSubscriptionPeriodStart(subscription: Stripe.Subscription): Date | null {
  const item = subscription.items?.data?.[0];
  if (item?.current_period_start) {
    return new Date(item.current_period_start * 1000);
  }
  const legacy = subscription as Stripe.Subscription & { current_period_start?: number };
  if (legacy.current_period_start) {
    return new Date(legacy.current_period_start * 1000);
  }
  if (subscription.start_date) {
    return new Date(subscription.start_date * 1000);
  }
  return null;
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): "ACTIVE" | "CANCELED" | "PAST_DUE" | "TRIALING" {
  const statusMap: Record<string, "ACTIVE" | "CANCELED" | "PAST_DUE" | "TRIALING"> = {
    active: "ACTIVE",
    trialing: "TRIALING",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    unpaid: "PAST_DUE",
    incomplete: "PAST_DUE",
    incomplete_expired: "CANCELED",
    paused: "PAST_DUE",
  };
  return statusMap[status] ?? "ACTIVE";
}

async function resolveAccessType(
  planId: string | undefined,
  fallback: "MONTHLY_SUBSCRIPTION" | "YEARLY_SUBSCRIPTION" = "MONTHLY_SUBSCRIPTION"
): Promise<"MONTHLY_SUBSCRIPTION" | "YEARLY_SUBSCRIPTION"> {
  if (!planId) return fallback;
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (plan?.accessType === "YEARLY_SUBSCRIPTION") return "YEARLY_SUBSCRIPTION";
  if (plan?.accessType === "MONTHLY_SUBSCRIPTION") return "MONTHLY_SUBSCRIPTION";
  return fallback;
}

async function resolveUserIdFromStripe(
  subscription: Stripe.Subscription
): Promise<string | null> {
  const fromMeta = subscription.metadata?.userId?.trim();
  if (fromMeta) return fromMeta;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) return null;

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  return user?.id ?? null;
}

/**
 * Upsert local Subscription from Stripe. Idempotent on stripeSubscriptionId.
 * Never revokes subscription access while status is ACTIVE or TRIALING
 * (including cancel_at_period_end=true).
 */
export async function applyStripeSubscriptionSnapshot(
  subscription: Stripe.Subscription,
  options?: {
    expectedUserId?: string;
    existingLocalId?: string;
  }
): Promise<LocalSubRef | null> {
  const stripeSubId = subscription.id;
  const status = mapStripeSubscriptionStatus(subscription.status);
  const periodStart = getSubscriptionPeriodStart(subscription);
  const periodEnd = getSubscriptionPeriodEnd(subscription);
  const cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
  const planId = subscription.metadata?.planId?.trim() || undefined;
  const accessType = await resolveAccessType(planId);
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  let dbSub = options?.existingLocalId
    ? await prisma.subscription.findUnique({ where: { id: options.existingLocalId } })
    : await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: stripeSubId },
      });

  if (dbSub && options?.expectedUserId && dbSub.userId !== options.expectedUserId) {
    logWebhookError("Subscription ownership mismatch", {
      localId: dbSub.id,
      expectedUserId: options.expectedUserId,
    });
    throw new Error("Subscription does not belong to this user.");
  }

  const resolvedUserId =
    options?.expectedUserId ??
    dbSub?.userId ??
    (await resolveUserIdFromStripe(subscription));

  if (!dbSub && !resolvedUserId) {
    logWebhookError("Subscription sync skipped: no matching DB row / userId", {
      stripeSubscriptionId: stripeSubId,
    });
    return null;
  }

  const cancelledAtValue = cancelAtPeriodEnd
    ? dbSub?.cancelledAt ?? new Date()
    : null;

  // Ends only when Stripe fully cancels — not when cancel_at_period_end is scheduled.
  const endsAtValue =
    status === "CANCELED"
      ? periodEnd ?? new Date()
      : cancelAtPeriodEnd
        ? periodEnd
        : null;

  if (!dbSub) {
    dbSub = await prisma.subscription.create({
      data: {
        userId: resolvedUserId!,
        planId: planId || null,
        status,
        accessType,
        provider: "stripe",
        stripeCustomerId: customerId ?? null,
        stripeSubscriptionId: stripeSubId,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd,
        cancelledAt: cancelledAtValue,
        endsAt: endsAtValue,
        startsAt: new Date(subscription.created * 1000),
      },
    });
    logWebhookDev("Subscription created from Stripe snapshot", {
      subscriptionId: dbSub.id,
      status,
      cancelAtPeriodEnd,
    });
  } else {
    dbSub = await prisma.subscription.update({
      where: { id: dbSub.id },
      data: {
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd,
        cancelledAt: cancelledAtValue,
        endsAt: endsAtValue,
        stripeCustomerId: customerId ?? dbSub.stripeCustomerId,
        ...(planId ? { planId } : {}),
        accessType,
      },
    });
    logWebhookDev("Subscription updated from Stripe snapshot", {
      subscriptionId: dbSub.id,
      status,
      cancelAtPeriodEnd,
      currentPeriodEnd: periodEnd?.toISOString() ?? null,
    });
  }

  // Access: keep premium while active/trialing — including scheduled cancellation.
  if (status === "ACTIVE" || status === "TRIALING") {
    const existingAccess = await prisma.userAccess.findFirst({
      where: { subscriptionId: dbSub.id, status: "ACTIVE" },
    });
    if (!existingAccess) {
      await grantSubscriptionAccess(dbSub.userId, dbSub.id, accessType, periodEnd);
    } else {
      await updateSubscriptionAccessEnd(dbSub.id, periodEnd);
    }
  } else if (status === "CANCELED") {
    // Fully ended — remove subscription-based premium only (not paper purchases).
    await revokeSubscriptionAccess(dbSub.id);
  }
  // PAST_DUE: leave access row; hasActiveSubscription gates on status.

  return { id: dbSub.id, userId: dbSub.userId };
}
