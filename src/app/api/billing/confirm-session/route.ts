import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { getStripe } from "@/lib/stripe";
import { fulfillCheckoutSession } from "@/services/billing/fulfill-checkout";
import { z } from "zod";

const confirmSessionSchema = z.object({
  sessionId: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = confirmSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(parsed.data.sessionId, {
      expand: ["subscription", "payment_intent", "invoice"],
    });

    if (session.metadata?.userId && session.metadata.userId !== user.id) {
      return NextResponse.json({ error: "This checkout session does not belong to your account." }, { status: 403 });
    }

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json({
        status: "pending",
        message: "Payment successful. Your access may take a few seconds to update.",
      });
    }

    const result = await fulfillCheckoutSession(session);

    if (result.status === "skipped") {
      return NextResponse.json({
        status: "pending",
        message: "Payment successful. Your access may take a few seconds to update.",
        reason: result.reason,
      });
    }

    return NextResponse.json({
      status: "fulfilled",
      message: "Your access has been updated.",
      result,
    });
  } catch (err) {
    console.error("Confirm checkout session error:", err);
    const message = err instanceof Error ? err.message : "Failed to confirm checkout session";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
