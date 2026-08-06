import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { resumeSubscriptionAtPeriodEnd } from "@/services/billing/subscription-lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/billing/subscription/resume
 * Clears cancel_at_period_end so the subscription renews again.
 */
export async function POST() {
  const user = await requireAuthApi();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await resumeSubscriptionAtPeriodEnd(user.id);
    return NextResponse.json({
      success: true,
      message: result.subscription.cancelAtPeriodEnd
        ? "Unable to resume — subscription still scheduled to cancel."
        : "Your subscription will renew at the end of the current billing period.",
      subscription: result.subscription,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not resume subscription";
    console.error("[billing:resume]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
