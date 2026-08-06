import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import {
  grantSubscriptionAccess,
  revokeSubscriptionAccess,
  updateSubscriptionAccessEnd,
} from "@/services/access-control";
import {
  enrichCheckoutSessionMetadata,
  fulfillCheckoutSession,
} from "./fulfill-checkout";
import { logWebhookDev, logWebhookError } from "./webhook-logger";

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const item = subscription.items?.data?.[0];
  if (item?.current_period_end) {
    return new Date(item.current_period_end * 1000);
  }
  // Older API shapes kept this on the subscription root.
  const legacy = subscription as Stripe.Subscription & { current_period_end?: number };
  if (legacy.current_period_end) {
    return new Date(legacy.current_period_end * 1000);
  }
  if (subscription.cancel_at) {
    return new Date(subscription.cancel_at * 1000);
  }
  return null;
}

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

function mapStripeSubscriptionStatus(
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
    // Stripe Dashboard commonly enables invoice.paid; payment_succeeded is the
    // classic name. Both mean the invoice is paid — handle the same way.
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
    userId: session.metadata?.userId,
    customer: session.customer,
    paymentStatus: session.payment_status,
  });

  // Always re-fetch: webhook body can omit expanded objects; metadata is authoritative from API.
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
    // Permanent skips still return 200 only if unpaid above. Missing metadata /
    // missing plan must fail so Stripe shows retries and ops notices the bug.
    logWebhookError("checkout.session.completed not fulfilled", {
      reason: result.reason,
      sessionId: enriched.id,
      metadata: enriched.metadata,
    });
    throw new Error(`Checkout not fulfilled: ${result.reason}`);
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
    metadata: subscription.metadata,
    userId: subscription.metadata?.userId,
  });

  await upsertSubscriptionFromStripe(subscription);
}

/**
 * Create or update local subscription + access from a Stripe subscription object.
 * Used by subscription.* events and as a fallback when invoice.paid arrives first.
 */
async function upsertSubscriptionFromStripe(
  subscription: Stripe.Subscription
): Promise<{ id: string; userId: string } | null> {
  const userId = subscription.metadata?.userId?.trim() || undefined;
  const stripeSubId = subscription.id;

  let dbSub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSubId },
  });

  const status = mapStripeSubscriptionStatus(subscription.status);
  const periodEnd = getSubscriptionPeriodEnd(subscription);
  const planId = subscription.metadata?.planId?.trim() || undefined;

  let accessType: "MONTHLY_SUBSCRIPTION" | "YEARLY_SUBSCRIPTION" = "MONTHLY_SUBSCRIPTION";
  if (planId) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (plan?.accessType === "YEARLY_SUBSCRIPTION") {
      accessType = "YEARLY_SUBSCRIPTION";
    } else if (plan?.accessType === "MONTHLY_SUBSCRIPTION") {
      accessType = "MONTHLY_SUBSCRIPTION";
    }
  }

  if (!dbSub && userId) {
    dbSub = await prisma.subscription.create({
      data: {
        userId,
        planId: planId || null,
        status,
        accessType,
        provider: "stripe",
        stripeCustomerId:
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id,
        stripeSubscriptionId: stripeSubId,
        currentPeriodEnd: periodEnd,
        startsAt: new Date(subscription.created * 1000),
      },
    });

    if (status === "ACTIVE" || status === "TRIALING") {
      const existingAccess = await prisma.userAccess.findFirst({
        where: { subscriptionId: dbSub.id, status: "ACTIVE" },
      });
      const userAccess =
        existingAccess ??
        (await grantSubscriptionAccess(userId, dbSub.id, accessType, periodEnd));
      logWebhookDev("Subscription created from subscription event", {
        subscriptionId: dbSub.id,
        userAccessId: userAccess.id,
        userId,
        planId,
      });
    }

    return { id: dbSub.id, userId };
  }

  if (!dbSub) {
    // Fallback: resolve user via Stripe customer.metadata.userId
    const customerId =
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer?.id;
    if (customerId) {
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (user) {
        dbSub = await prisma.subscription.create({
          data: {
            userId: user.id,
            planId: planId || null,
            status,
            accessType,
            provider: "stripe",
            stripeCustomerId: customerId,
            stripeSubscriptionId: stripeSubId,
            currentPeriodEnd: periodEnd,
            startsAt: new Date(subscription.created * 1000),
          },
        });
        if (status === "ACTIVE" || status === "TRIALING") {
          await grantSubscriptionAccess(user.id, dbSub.id, accessType, periodEnd);
        }
        logWebhookDev("Subscription created via customer lookup", {
          subscriptionId: dbSub.id,
          userId: user.id,
        });
        return { id: dbSub.id, userId: user.id };
      }
    }

    logWebhookError("Subscription change skipped: no matching DB subscription / userId", {
      stripeSubscriptionId: stripeSubId,
      metadata: subscription.metadata,
    });
    return null;
  }

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: {
      status,
      currentPeriodEnd: periodEnd,
      endsAt: status === "CANCELED" ? periodEnd : null,
      ...(planId ? { planId } : {}),
    },
  });

  if (status === "ACTIVE" || status === "TRIALING") {
    const existingAccess = await prisma.userAccess.findFirst({
      where: { subscriptionId: dbSub.id, status: "ACTIVE" },
    });
    if (!existingAccess) {
      await grantSubscriptionAccess(dbSub.userId, dbSub.id, accessType, periodEnd);
    } else {
      await updateSubscriptionAccessEnd(dbSub.id, periodEnd);
    }
  } else if (status === "CANCELED" || status === "PAST_DUE") {
    await revokeSubscriptionAccess(dbSub.id);
  }

  logWebhookDev("Subscription updated in DB", {
    subscriptionId: dbSub.id,
    status,
    currentPeriodEnd: periodEnd?.toISOString() ?? null,
  });

  return { id: dbSub.id, userId: dbSub.userId };
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

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: { status: "CANCELED", endsAt: new Date() },
  });
  await revokeSubscriptionAccess(dbSub.id);
  logWebhookDev("Subscription canceled and access revoked", { subscriptionId: dbSub.id });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  logWebhookDev("invoice.paid / payment_succeeded", {
    invoiceId: invoice.id,
    amountPaid: invoice.amount_paid,
    parentType: invoice.parent?.type ?? null,
  });

  const stripeSubId = getInvoiceSubscriptionId(invoice);
  if (!stripeSubId) {
    // One-time payment invoices may have no subscription — not an error.
    logWebhookDev("Invoice payment succeeded: no subscription on invoice (likely one-time)", {
      invoiceId: invoice.id,
    });
    return;
  }

  let dbSub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSubId },
  });

  // Race / missing earlier fulfill: invent local subscription from Stripe object.
  if (!dbSub) {
    const stripe = getStripe();
    const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubId);

    // Prefer live subscription metadata; fall back to invoice parent snapshot metadata.
    const invoiceMeta = invoice.parent?.subscription_details?.metadata ?? {};
    if (!stripeSubscription.metadata?.userId && invoiceMeta.userId) {
      stripeSubscription.metadata = {
        ...stripeSubscription.metadata,
        ...invoiceMeta,
      };
    }

    const upserted = await upsertSubscriptionFromStripe(stripeSubscription);
    if (!upserted) {
      logWebhookError("Invoice paid but could not create subscription row", {
        invoiceId: invoice.id,
        stripeSubId,
        subscriptionMetadata: stripeSubscription.metadata,
        invoiceMetadata: invoiceMeta,
      });
      throw new Error(
        `Invoice ${invoice.id}: no local subscription for ${stripeSubId} and missing user metadata`
      );
    }
    dbSub = await prisma.subscription.findUnique({ where: { id: upserted.id } });
  }

  if (!dbSub) {
    throw new Error(`Invoice ${invoice.id}: subscription row missing after upsert`);
  }

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: { status: "ACTIVE" },
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

  const existing = await prisma.payment.findFirst({
    where: { providerPaymentId: invoice.id },
  });
  if (!existing && invoice.amount_paid) {
    const payment = await prisma.payment.create({
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
      paymentId: payment.id,
      subscriptionId: dbSub.id,
    });
  }

  logWebhookDev("Invoice payment processed", {
    invoiceId: invoice.id,
    subscriptionId: dbSub.id,
    userId: dbSub.userId,
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

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: { status: "PAST_DUE" },
  });
  logWebhookDev("Subscription marked PAST_DUE", { subscriptionId: dbSub.id });
}
