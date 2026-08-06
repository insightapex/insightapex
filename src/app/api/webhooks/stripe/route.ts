import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { handleStripeWebhook } from "@/services/billing/webhook";
import { logWebhookDev, logWebhookError } from "@/services/billing/webhook-logger";

// Ensure raw body + Node runtime for Stripe signature verification + Prisma.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");

  if (!signature) {
    logWebhookError("Rejected: missing stripe-signature header");
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logWebhookError("Rejected: STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  try {
    const stripe = getStripe();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    logWebhookDev("Event received", {
      id: event.id,
      type: event.type,
      livemode: event.livemode,
      created: new Date(event.created * 1000).toISOString(),
    });

    await handleStripeWebhook(event);

    logWebhookDev("Event handled successfully", { id: event.id, type: event.type });
    return NextResponse.json({ received: true });
  } catch (err) {
    logWebhookError("Event handling failed", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    const message = err instanceof Error ? err.message : "Webhook error";
    // Invalid signatures will never succeed — 400. Application/DB failures use 500 so Stripe retries.
    if (err instanceof Stripe.errors.StripeSignatureVerificationError) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
