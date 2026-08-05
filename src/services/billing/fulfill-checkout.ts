import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import {
  grantPurchaseAccess,
  grantSubscriptionAccess,
} from "@/services/access-control";
import {
  notifyPurchaseCompleted,
  notifySubscriptionActivated,
} from "@/services/notifications";
import { logWebhookDev } from "./webhook-logger";

export type FulfillCheckoutResult =
  | {
      status: "fulfilled";
      kind: "subscription";
      subscriptionId: string;
      userAccessId: string;
      paymentId: string | null;
      alreadyExisted: boolean;
    }
  | {
      status: "fulfilled";
      kind: "purchase";
      purchaseId: string;
      userAccessId: string;
      paymentId: string;
      alreadyExisted: boolean;
    }
  | {
      status: "skipped";
      reason: string;
    };

function resolveCheckoutType(session: Stripe.Checkout.Session): string | undefined {
  return session.metadata?.checkoutType ?? session.metadata?.type;
}

function resolvePaymentReference(session: Stripe.Checkout.Session): string {
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (paymentIntentId) return paymentIntentId;

  const invoiceId =
    typeof session.invoice === "string" ? session.invoice : session.invoice?.id;

  if (invoiceId) return invoiceId;

  return session.id;
}

export async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<FulfillCheckoutResult> {
  logWebhookDev("Fulfilling checkout session", {
    sessionId: session.id,
    mode: session.mode,
    paymentStatus: session.payment_status,
    metadata: session.metadata,
  });

  const userId = session.metadata?.userId;
  const checkoutType = resolveCheckoutType(session);

  if (!userId) {
    const reason = "Missing userId in session metadata";
    logWebhookDev(`Skipped: ${reason}`, { metadata: session.metadata });
    return { status: "skipped", reason };
  }

  if (!checkoutType) {
    const reason = "Missing checkoutType/type in session metadata";
    logWebhookDev(`Skipped: ${reason}`, { metadata: session.metadata });
    return { status: "skipped", reason };
  }

  if (checkoutType === "subscription") {
    return fulfillSubscriptionCheckout(session, userId);
  }

  if (checkoutType === "paper" || checkoutType === "mock_exam") {
    return fulfillProductCheckout(session, userId);
  }

  const reason = `Unsupported checkout type: ${checkoutType}`;
  logWebhookDev(`Skipped: ${reason}`);
  return { status: "skipped", reason };
}

async function fulfillSubscriptionCheckout(
  session: Stripe.Checkout.Session,
  userId: string
): Promise<FulfillCheckoutResult> {
  const planId = session.metadata?.planId;
  if (!planId) {
    const reason = "Missing planId in session metadata";
    logWebhookDev(`Skipped subscription: ${reason}`);
    return { status: "skipped", reason };
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    const reason = `Plan not found: ${planId}`;
    logWebhookDev(`Skipped subscription: ${reason}`);
    return { status: "skipped", reason };
  }

  const stripeSubId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  const existing = stripeSubId
    ? await prisma.subscription.findFirst({ where: { stripeSubscriptionId: stripeSubId } })
    : await prisma.subscription.findFirst({
        where: { userId, planId: plan.id, status: { in: ["ACTIVE", "TRIALING"] } },
      });

  if (existing) {
    const userAccess = await prisma.userAccess.findFirst({
      where: { subscriptionId: existing.id, status: "ACTIVE" },
    });
    logWebhookDev("Subscription already fulfilled", {
      subscriptionId: existing.id,
      userAccessId: userAccess?.id,
    });
    return {
      status: "fulfilled",
      kind: "subscription",
      subscriptionId: existing.id,
      userAccessId: userAccess?.id ?? "",
      paymentId: null,
      alreadyExisted: true,
    };
  }

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      planId: plan.id,
      status: "ACTIVE",
      accessType: plan.accessType as "MONTHLY_SUBSCRIPTION" | "YEARLY_SUBSCRIPTION",
      priceCents: plan.priceCents,
      currency: plan.currency,
      provider: "stripe",
      stripeCustomerId:
        typeof session.customer === "string" ? session.customer : session.customer?.id,
      stripeSubscriptionId: stripeSubId,
      startsAt: new Date(),
    },
  });

  const userAccess = await grantSubscriptionAccess(
    userId,
    subscription.id,
    plan.accessType as "MONTHLY_SUBSCRIPTION" | "YEARLY_SUBSCRIPTION"
  );

  let paymentId: string | null = null;
  const paymentReference = resolvePaymentReference(session);
  const amountCents = session.amount_total ?? plan.priceCents;

  if (amountCents && amountCents > 0) {
    const existingPayment = await prisma.payment.findFirst({
      where: {
        OR: [
          { providerPaymentId: paymentReference },
          { subscriptionId: subscription.id, status: "COMPLETED" },
        ],
      },
    });

    if (!existingPayment) {
      const payment = await prisma.payment.create({
        data: {
          userId,
          subscriptionId: subscription.id,
          amountCents,
          currency: (session.currency ?? plan.currency ?? "gbp").toUpperCase(),
          status: "COMPLETED",
          provider: "stripe",
          providerPaymentId: paymentReference,
        },
      });
      paymentId = payment.id;
    }
  }

  logWebhookDev("Subscription fulfilled", {
    userId,
    subscriptionId: subscription.id,
    userAccessId: userAccess.id,
    paymentId,
    planId: plan.id,
  });

  try {
    await notifySubscriptionActivated({ userId, planName: plan.name });
  } catch (notifyError) {
    logWebhookDev("Failed to create subscription notification", { error: String(notifyError) });
  }

  return {
    status: "fulfilled",
    kind: "subscription",
    subscriptionId: subscription.id,
    userAccessId: userAccess.id,
    paymentId,
    alreadyExisted: false,
  };
}

async function fulfillProductCheckout(
  session: Stripe.Checkout.Session,
  userId: string
): Promise<FulfillCheckoutResult> {
  const productId = session.metadata?.productId;
  if (!productId) {
    const reason = "Missing productId in session metadata";
    logWebhookDev(`Skipped product: ${reason}`);
    return { status: "skipped", reason };
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    const reason = `Product not found: ${productId}`;
    logWebhookDev(`Skipped product: ${reason}`);
    return { status: "skipped", reason };
  }

  const paymentReference = resolvePaymentReference(session);

  const existingPurchase = await prisma.purchase.findFirst({
    where: {
      OR: [
        { stripePaymentId: paymentReference },
        { providerPaymentId: paymentReference },
        { userId, productId: product.id, status: "COMPLETED" },
      ],
    },
  });

  if (existingPurchase) {
    const userAccess = await prisma.userAccess.findFirst({
      where: { purchaseId: existingPurchase.id, status: "ACTIVE" },
    });
    const payment = await prisma.payment.findFirst({
      where: { purchaseId: existingPurchase.id },
    });
    logWebhookDev("Purchase already fulfilled", {
      purchaseId: existingPurchase.id,
      userAccessId: userAccess?.id,
    });
    return {
      status: "fulfilled",
      kind: "purchase",
      purchaseId: existingPurchase.id,
      userAccessId: userAccess?.id ?? "",
      paymentId: payment?.id ?? "",
      alreadyExisted: true,
    };
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
      currency: (session.currency ?? product.currency ?? "gbp").toUpperCase(),
      provider: "stripe",
      stripePaymentId: paymentReference,
      providerPaymentId: paymentReference,
      startsAt: new Date(),
    },
  });

  const userAccess = await grantPurchaseAccess(
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
      providerPaymentId: paymentReference,
    },
  });

  logWebhookDev("Purchase fulfilled", {
    userId,
    purchaseId: purchase.id,
    userAccessId: userAccess.id,
    paymentId: payment.id,
    productId: product.id,
    paperId: product.paperId,
    mockExamId: product.mockExamId,
    purchaseType: session.metadata?.purchaseType,
  });

  try {
    await notifyPurchaseCompleted({ userId, productName: product.name });
  } catch (notifyError) {
    logWebhookDev("Failed to create purchase notification", { error: String(notifyError) });
  }

  return {
    status: "fulfilled",
    kind: "purchase",
    purchaseId: purchase.id,
    userAccessId: userAccess.id,
    paymentId: payment.id,
    alreadyExisted: false,
  };
}
