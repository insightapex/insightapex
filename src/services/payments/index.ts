/**
 * Payments service placeholder.
 *
 * Phase 1 does NOT implement payments. This file exists purely so future
 * Stripe integration (subscriptions + one-time paper/question-pack
 * purchases) has an obvious home, matching the `Subscription` and
 * `Purchase` Prisma models already defined in schema.prisma.
 *
 * TODO Phase 2:
 * - createCheckoutSession(userId, priceId)
 * - createSubscriptionPortalSession(userId)
 * - handleStripeWebhook(event)
 * - hasActiveAccess(userId, paperId) — used by quiz routes to gate PREMIUM papers
 */

export async function hasActiveAccess(_userId: string, _paperId: string): Promise<boolean> {
  // Phase 1: everything is FREE, so access is always granted.
  // Phase 2: check Subscription/Purchase tables here.
  return true;
}
