import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import {
  grantSubscriptionAccess,
  revokeSubscriptionAccess,
  updateSubscriptionAccessEnd,
} from "@/services/access-control";
import { fulfillCheckoutSession } from "./fulfill-checkout";
import { logWebhookDev } from "./webhook-logger";

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const item = subscription.items?.data?.[0];
  if (item?.current_period_end) {
    return new Date(item.current_period_end * 1000);
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

  return null;
}

export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  logWebhookDev(`Dispatching handler for ${event.type}`, { eventId: event.id });

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionChange(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      logWebhookDev(`No handler for event type: ${event.type}`);
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

  const result = await fulfillCheckoutSession(session);

  if (result.status === "skipped") {
    logWebhookDev("checkout.session.completed not fulfilled", { reason: result.reason });
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  logWebhookDev("customer.subscription change", {
    subscriptionId: subscription.id,
    status: subscription.status,
    metadata: subscription.metadata,
    userId: subscription.metadata?.userId,
  });

  const userId = subscription.metadata?.userId;
  const stripeSubId = subscription.id;

  let dbSub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSubId },
  });

  const statusMap: Record<string, "ACTIVE" | "CANCELED" | "PAST_DUE" | "TRIALING"> = {
    active: "ACTIVE",
    trialing: "TRIALING",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    unpaid: "PAST_DUE",
  };
  const status = statusMap[subscription.status] ?? "ACTIVE";
  const periodEnd = getSubscriptionPeriodEnd(subscription);

  if (!dbSub && userId) {
    const planId = subscription.metadata?.planId;
    dbSub = await prisma.subscription.create({
      data: {
        userId,
        planId: planId || null,
        status,
        accessType: "MONTHLY_SUBSCRIPTION",
        provider: "stripe",
        stripeCustomerId:
          typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
        stripeSubscriptionId: stripeSubId,
        currentPeriodEnd: periodEnd,
        startsAt: new Date(subscription.created * 1000),
      },
    });
    if (status === "ACTIVE" || status === "TRIALING") {
      const userAccess = await grantSubscriptionAccess(
        userId,
        dbSub.id,
        "MONTHLY_SUBSCRIPTION",
        periodEnd
      );
      logWebhookDev("Subscription created from subscription event", {
        subscriptionId: dbSub.id,
        userAccessId: userAccess.id,
        userId,
        planId,
      });
    }
    return;
  }

  if (!dbSub) {
    logWebhookDev("Subscription change skipped: no matching DB subscription", {
      stripeSubscriptionId: stripeSubId,
    });
    return;
  }

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: {
      status,
      currentPeriodEnd: periodEnd,
      endsAt: status === "CANCELED" ? periodEnd : null,
    },
  });

  if (status === "ACTIVE" || status === "TRIALING") {
    await updateSubscriptionAccessEnd(dbSub.id, periodEnd);
  } else if (status === "CANCELED" || status === "PAST_DUE") {
    await revokeSubscriptionAccess(dbSub.id);
  }

  logWebhookDev("Subscription updated in DB", {
    subscriptionId: dbSub.id,
    status,
    currentPeriodEnd: periodEnd?.toISOString() ?? null,
  });
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
  logWebhookDev("invoice.payment_succeeded", {
    invoiceId: invoice.id,
    amountPaid: invoice.amount_paid,
  });

  const stripeSubId = getInvoiceSubscriptionId(invoice);
  if (!stripeSubId) {
    logWebhookDev("Invoice payment succeeded skipped: no subscription on invoice");
    return;
  }

  const dbSub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: stripeSubId },
  });
  if (!dbSub) {
    logWebhookDev("Invoice payment succeeded skipped: DB subscription not found", { stripeSubId });
    return;
  }

  await prisma.subscription.update({
    where: { id: dbSub.id },
    data: { status: "ACTIVE" },
  });

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
