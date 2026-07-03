import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe } from "@/lib/stripe";
import { handleStripeWebhook } from "@/services/billing/webhook";
import { logWebhookDev } from "@/services/billing/webhook-logger";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");

  if (!signature) {
    logWebhookDev("Rejected: missing stripe-signature header");
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logWebhookDev("Rejected: STRIPE_WEBHOOK_SECRET is not set in .env");
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
    console.error("Stripe webhook error:", err);
    logWebhookDev("Event handling failed", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    const message = err instanceof Error ? err.message : "Webhook error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
