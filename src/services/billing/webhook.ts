import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import {
  grantPurchaseAccess,
  grantSubscriptionAccess,
  revokeSubscriptionAccess,
  updateSubscriptionAccessEnd,
} from "@/services/access-control";
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
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  logWebhookDev(`Dispatching handler for ${event.type}`);

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
    customer: session.customer,
    paymentStatus: session.payment_status,
  });

  const userId = session.metadata?.userId;
  const type = session.metadata?.type;
  if (!userId || !type) {
    logWebhookDev("Skipped checkout.session.completed: missing userId or type in metadata", {
      metadata: session.metadata,
    });
    return;
  }

  if (type === "subscription") {
    const planId = session.metadata?.planId;
    if (!planId) {
      logWebhookDev("Skipped subscription checkout: missing planId in metadata");
      return;
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      logWebhookDev("Skipped subscription checkout: plan not found", { planId });
      return;
    }

    const stripeSubId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;

    const existing = stripeSubId
      ? await prisma.subscription.findFirst({ where: { stripeSubscriptionId: stripeSubId } })
      : null;

    if (!existing) {
      const subscription = await prisma.subscription.create({
        data: {
          userId,
          planId: plan.id,
          status: "ACTIVE",
          accessType: plan.accessType as "MONTHLY_SUBSCRIPTION" | "YEARLY_SUBSCRIPTION",
          priceCents: plan.priceCents,
          currency: plan.currency,
          provider: "stripe",
          stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
          stripeSubscriptionId: stripeSubId,
          startsAt: new Date(),
        },
      });

      await grantSubscriptionAccess(
        userId,
        subscription.id,
        plan.accessType as "MONTHLY_SUBSCRIPTION" | "YEARLY_SUBSCRIPTION"
      );

      logWebhookDev("Subscription created and access granted", {
        subscriptionId: subscription.id,
        userId,
        planId: plan.id,
        stripeSubscriptionId: stripeSubId,
      });

      if (session.amount_total) {
        const payment = await prisma.payment.create({
          data: {
            userId,
            subscriptionId: subscription.id,
            amountCents: session.amount_total,
            currency: (session.currency ?? "gbp").toUpperCase(),
            status: "COMPLETED",
            provider: "stripe",
            providerPaymentId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id,
          },
        });
        logWebhookDev("Subscription payment recorded", { paymentId: payment.id });
      }
    } else {
      logWebhookDev("Subscription already exists, skipping create", {
        stripeSubscriptionId: stripeSubId,
        subscriptionId: existing.id,
      });
    }
    return;
  }

  const productId = session.metadata?.productId;
  if (!productId) {
    logWebhookDev("Skipped product checkout: missing productId in metadata");
    return;
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    logWebhookDev("Skipped product checkout: product not found", { productId });
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  const existingPurchase = paymentIntentId
    ? await prisma.purchase.findFirst({ where: { stripePaymentId: paymentIntentId } })
    : null;

  if (existingPurchase) {
    logWebhookDev("Purchase already exists, skipping create", {
      purchaseId: existingPurchase.id,
      stripePaymentId: paymentIntentId,
    });
    return;
  }

  const purchase = await prisma.purchase.create({
    data: {
      userId,
      productId: product.id,
      type: product.type === "PAPER" ? "ONE_TIME_PAPER" : "ONE_TIME_MOCK_EXAM",
      accessType: product.accessType,
      paperId: product.paperId,
      mockExamId: product.mockExamId,
      status: "COMPLETED",
      amountCents: session.amount_total ?? product.priceCents ?? 0,
      currency: (session.currency ?? "gbp").toUpperCase(),
      provider: "stripe",
      stripePaymentId: paymentIntentId,
      startsAt: new Date(),
    },
  });

  await grantPurchaseAccess(
    userId,
    purchase.id,
    product.accessType as "ONE_TIME_PAPER" | "ONE_TIME_MOCK_EXAM",
    product.paperId,
    product.mockExamId
  );

  const payment = await prisma.payment.create({
    data: {
      userId,
      purchaseId: purchase.id,
      amountCents: purchase.amountCents ?? 0,
      currency: purchase.currency ?? "GBP",
      status: "COMPLETED",
      provider: "stripe",
      providerPaymentId: paymentIntentId,
    },
  });

  logWebhookDev("Purchase created and access granted", {
    purchaseId: purchase.id,
    paymentId: payment.id,
    userId,
    productId: product.id,
    purchaseType: session.metadata?.purchaseType,
  });
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  logWebhookDev("customer.subscription change", {
    subscriptionId: subscription.id,
    status: subscription.status,
    metadata: subscription.metadata,
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
      await grantSubscriptionAccess(userId, dbSub.id, "MONTHLY_SUBSCRIPTION", periodEnd);
    }
    logWebhookDev("Subscription created from subscription event", {
      subscriptionId: dbSub.id,
      userId,
      planId,
    });
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
    logWebhookDev("Renewal payment recorded", { paymentId: invoice.id, subscriptionId: dbSub.id });
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
