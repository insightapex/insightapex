import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import {
  grantSubscriptionAccess,
  revokeSubscriptionAccess,
} from "@/services/access-control";
import {
  enrichCheckoutSessionMetadata,
  fulfillCheckoutSession,
} from "./fulfill-checkout";
import {
  applyStripeSubscriptionSnapshot,
  getSubscriptionPeriodEnd,
} from "./stripe-subscription-sync";
import { logWebhookDev, logWebhookError } from "./webhook-logger";

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const fromParent = invoice.parent?.subscription_details?.subscription;
  if (fromParent) {
    return typeof fromParent === "string" ? fromParent : fromParent.id;
  }

  const legacy = (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription })
    .subscription;
  if (legacy) {
    return typeof legacy === "string" ? legacy : legacy.id;
  }

  for (const line of invoice.lines?.data ?? []) {
    if (line.subscription) {
      return typeof line.subscription === "string" ? line.subscription : line.subscription.id;
    }
    const fromLine =
      line.parent?.subscription_item_details?.subscription ??
      line.parent?.invoice_item_details?.subscription;
    if (fromLine) return fromLine;
  }

  return null;
}

export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  logWebhookDev(`Dispatching handler for ${event.type}`, { eventId: event.id });

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionChange(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case "invoice.paid":
    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      logWebhookDev(`No handler for event type: ${event.type}`, { eventId: event.id });
      break;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  logWebhookDev("checkout.session.completed", {
    sessionId: session.id,
    mode: session.mode,
    metadata: session.metadata,
    paymentStatus: session.payment_status,
  });

  const stripe = getStripe();
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ["subscription", "payment_intent", "invoice", "customer"],
  });
  const enriched = enrichCheckoutSessionMetadata(fullSession);

  if (enriched.payment_status === "unpaid") {
    logWebhookDev("Checkout completed but unpaid; waiting for async payment", {
      sessionId: enriched.id,
    });
    return;
  }

  const result = await fulfillCheckoutSession(enriched);

  if (result.status === "skipped") {
    logWebhookError("checkout.session.completed not fulfilled", {
      reason: result.reason,
      sessionId: enriched.id,
    });
    throw new Error(`Checkout not fulfilled: ${result.reason}`);
  }

  // Sync period / cancel flags from expanded subscription object if present.
  if (
    result.kind === "subscription" &&
    enriched.subscription &&
    typeof enriched.subscription !== "string"
  ) {
    await applyStripeSubscriptionSnapshot(enriched.subscription);
  }

  logWebhookDev("checkout.session.completed fulfilled", {
    sessionId: enriched.id,
    kind: result.kind,
    alreadyExisted: result.alreadyExisted,
  });
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  logWebhookDev("customer.subscription change", {
    subscriptionId: subscription.id,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  const result = await applyStripeSubscriptionSnapshot(subscription);
  if (!result) {
    // Do not throw for orphan events with no local user yet — retry won't create user.
    logWebhookError("customer.subscription change could not map to local user", {
      stripeSubscriptionId: subscription.id,
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  logWebhookDev("customer.subscription.deleted", { subscriptionId: subscription.id });

  const dbSub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!dbSub) {
    logWebhookDev("Subscription delete skipped: no matching DB subscription");
    return;
  }

  const periodEnd = getSubscriptionPeriodEnd(subscription);

  // Mark cancelled; never delete the row. revokeSubscriptionAccess only touches
  // UserAccess rows linked to this subscriptionId — paper purchases are untouched.
  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: {
      status: "CANCELED",
      cancelAtPeriodEnd: false,
      cancelledAt: dbSub.cancelledAt ?? new Date(),
      endsAt: periodEnd ?? new Date(),
      currentPeriodEnd: periodEnd ?? dbSub.currentPeriodEnd,
    },
  });
  await revokeSubscriptionAccess(dbSub.id);
  logWebhookDev("Subscription canceled and access revoked", {
    subscriptionId: dbSub.id,
    // Paper purchases remain — revoke is subscription-scoped only.
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  logWebhookDev("invoice.paid / payment_succeeded", {
    invoiceId: invoice.id,
    amountPaid: invoice.amount_paid,
  });

  const stripeSubId = getInvoiceSubscriptionId(invoice);
  if (!stripeSubId) {
    logWebhookDev("Invoice paid without subscription (one-time invoice)", {
      invoiceId: invoice.id,
    });
    return;
  }

  let dbSub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSubId },
  });

  const stripe = getStripe();
  const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubId);

  const invoiceMeta = invoice.parent?.subscription_details?.metadata ?? {};
  if (!stripeSubscription.metadata?.userId && invoiceMeta.userId) {
    stripeSubscription.metadata = {
      ...stripeSubscription.metadata,
      ...invoiceMeta,
    };
  }

  const upserted = await applyStripeSubscriptionSnapshot(stripeSubscription, {
    existingLocalId: dbSub?.id,
  });

  if (!upserted) {
    logWebhookError("Invoice paid but could not create subscription row", {
      invoiceId: invoice.id,
      stripeSubId,
    });
    throw new Error(
      `Invoice ${invoice.id}: no local subscription for ${stripeSubId} and missing user metadata`
    );
  }

  dbSub = await prisma.subscription.findUnique({ where: { id: upserted.id } });
  if (!dbSub) {
    throw new Error(`Invoice ${invoice.id}: subscription row missing after upsert`);
  }

  // Ensure ACTIVE after successful payment (unless already cancel-at-period-end flow).
  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: {
      status: "ACTIVE",
      currentPeriodEnd: getSubscriptionPeriodEnd(stripeSubscription) ?? dbSub.currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(stripeSubscription.cancel_at_period_end),
    },
  });

  const existingAccess = await prisma.userAccess.findFirst({
    where: { subscriptionId: dbSub.id, status: "ACTIVE" },
  });
  if (!existingAccess) {
    const accessType =
      dbSub.accessType === "YEARLY_SUBSCRIPTION"
        ? "YEARLY_SUBSCRIPTION"
        : "MONTHLY_SUBSCRIPTION";
    await grantSubscriptionAccess(dbSub.userId, dbSub.id, accessType);
  }

  // Idempotent payment row by invoice id.
  const existing = await prisma.payment.findFirst({
    where: { providerPaymentId: invoice.id },
  });
  if (!existing && invoice.amount_paid) {
    await prisma.payment.create({
      data: {
        userId: dbSub.userId,
        subscriptionId: dbSub.id,
        amountCents: invoice.amount_paid,
        currency: (invoice.currency ?? "gbp").toUpperCase(),
        status: "COMPLETED",
        provider: "stripe",
        providerPaymentId: invoice.id,
      },
    });
    logWebhookDev("Renewal payment recorded", {
      invoiceId: invoice.id,
      subscriptionId: dbSub.id,
    });
  }

  logWebhookDev("Invoice payment processed", {
    invoiceId: invoice.id,
    subscriptionId: dbSub.id,
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  logWebhookDev("invoice.payment_failed", { invoiceId: invoice.id });

  const stripeSubId = getInvoiceSubscriptionId(invoice);
  if (!stripeSubId) {
    logWebhookDev("Invoice payment failed skipped: no subscription on invoice");
    return;
  }

  const dbSub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSubId },
  });
  if (!dbSub) {
    logWebhookDev("Invoice payment failed skipped: DB subscription not found", { stripeSubId });
    return;
  }

  // Mark past due; do not record as COMPLETED payment.
  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: { status: "PAST_DUE" },
  });

  if (invoice.id) {
    const existingPayment = await prisma.payment.findFirst({
      where: { providerPaymentId: invoice.id },
    });
    if (!existingPayment) {
      await prisma.payment.create({
        data: {
          userId: dbSub.userId,
          subscriptionId: dbSub.id,
          amountCents: invoice.amount_due ?? invoice.amount_remaining ?? 0,
          currency: (invoice.currency ?? "gbp").toUpperCase(),
          status: "FAILED",
          provider: "stripe",
          providerPaymentId: invoice.id,
        },
      });
    }
  }

  logWebhookDev("Subscription marked PAST_DUE (access follows status gates)", {
    subscriptionId: dbSub.id,
  });
}
