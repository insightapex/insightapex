import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { cancelSubscriptionAtPeriodEnd } from "@/services/billing/subscription-lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/subscription/cancel
 * Schedules Stripe cancellation at period end (cancel_at_period_end: true).
 * Premium remains until currentPeriodEnd. Idempotent if already scheduled.
 */
export async function POST() {
  const user = await requireAuthApi();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await cancelSubscriptionAtPeriodEnd(user.id);
    return NextResponse.json({
      success: true,
      alreadyScheduled: result.alreadyScheduled,
      message: result.alreadyScheduled
        ? "Your subscription is already scheduled to cancel at the end of the billing period."
        : "Your subscription will cancel at the end of the current billing period. You keep premium access until then.",
      subscription: result.subscription,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not cancel subscription";
    console.error("[billing:cancel]", message);
    const status =
      message.includes("No active subscription") || message.includes("does not belong")
        ? 400
        : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
