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
import { logWebhookDev, logWebhookError } from "./webhook-logger";

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
  const meta = session.metadata ?? {};
  const fromMeta = meta.checkoutType || meta.type;
  if (fromMeta) return fromMeta;

  const purchaseType = meta.purchaseType;
  if (purchaseType === "SUBSCRIPTION") return "subscription";
  if (purchaseType === "ONE_TIME_PAPER") return "paper";
  if (purchaseType === "ONE_TIME_MOCK_EXAM") return "mock_exam";

  if (session.mode === "subscription") return "subscription";
  if (session.mode === "payment" && meta.productId) return "product";

  return undefined;
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

/**
 * Merge metadata from expanded customer/subscription/client_reference_id so
 * webhook payloads missing fields still fulfill.
 */
export function enrichCheckoutSessionMetadata(
  session: Stripe.Checkout.Session
): Stripe.Checkout.Session {
  const metadata: Record<string, string> = {
    ...(session.metadata ?? {}),
  };

  if (!metadata.userId && session.client_reference_id) {
    metadata.userId = session.client_reference_id;
  }

  const customer = session.customer;
  if (customer && typeof customer !== "string" && "metadata" in customer && customer.metadata) {
    if (!metadata.userId && customer.metadata.userId) {
      metadata.userId = customer.metadata.userId;
    }
  }

  const subscription = session.subscription;
  if (subscription && typeof subscription !== "string") {
    const subMeta = subscription.metadata ?? {};
    if (!metadata.userId && subMeta.userId) metadata.userId = subMeta.userId;
    if (!metadata.planId && subMeta.planId) metadata.planId = subMeta.planId;
    if (!metadata.checkoutType && !metadata.type) {
      metadata.checkoutType = subMeta.checkoutType || "subscription";
    }
    if (!metadata.purchaseType && subMeta.purchaseType) {
      metadata.purchaseType = subMeta.purchaseType;
    }
  }

  if (!metadata.checkoutType && !metadata.type) {
    if (session.mode === "subscription") {
      metadata.checkoutType = "subscription";
    } else if (metadata.purchaseType === "ONE_TIME_PAPER") {
      metadata.checkoutType = "paper";
    } else if (metadata.purchaseType === "ONE_TIME_MOCK_EXAM") {
      metadata.checkoutType = "mock_exam";
    } else if (metadata.productId) {
      metadata.checkoutType = "product";
    }
  }

  return { ...session, metadata };
}

export async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<FulfillCheckoutResult> {
  const enriched = enrichCheckoutSessionMetadata(session);

  logWebhookDev("Fulfilling checkout session", {
    sessionId: enriched.id,
    mode: enriched.mode,
    paymentStatus: enriched.payment_status,
    metadata: enriched.metadata,
  });

  if (enriched.payment_status === "unpaid") {
    const reason = `Payment not completed yet (payment_status=${enriched.payment_status})`;
    logWebhookDev(`Skipped: ${reason}`, { sessionId: enriched.id });
    return { status: "skipped", reason };
  }

  const userId = enriched.metadata?.userId?.trim() || undefined;
  const checkoutType = resolveCheckoutType(enriched);

  if (!userId) {
    const reason = "Missing userId in session metadata";
    logWebhookError(`Skipped: ${reason}`, { metadata: enriched.metadata, sessionId: enriched.id });
    return { status: "skipped", reason };
  }

  if (!checkoutType) {
    const reason = "Missing checkoutType/type in session metadata";
    logWebhookError(`Skipped: ${reason}`, { metadata: enriched.metadata, sessionId: enriched.id });
    return { status: "skipped", reason };
  }

  if (checkoutType === "subscription") {
    return fulfillSubscriptionCheckout(enriched, userId);
  }

  if (checkoutType === "paper" || checkoutType === "mock_exam" || checkoutType === "product") {
    return fulfillProductCheckout(enriched, userId);
  }

  const reason = `Unsupported checkout type: ${checkoutType}`;
  logWebhookError(`Skipped: ${reason}`, { sessionId: enriched.id });
  return { status: "skipped", reason };
}

async function ensureActiveSubscriptionAccess(
  userId: string,
  subscriptionId: string,
  accessType: "MONTHLY_SUBSCRIPTION" | "YEARLY_SUBSCRIPTION"
) {
  const existing = await prisma.userAccess.findFirst({
    where: { subscriptionId, status: "ACTIVE" },
  });
  if (existing) return existing;

  return grantSubscriptionAccess(userId, subscriptionId, accessType);
}

async function fulfillSubscriptionCheckout(
  session: Stripe.Checkout.Session,
  userId: string
): Promise<FulfillCheckoutResult> {
  const planId = session.metadata?.planId?.trim() || undefined;
  if (!planId) {
    const reason = "Missing planId in session metadata";
    logWebhookError(`Skipped subscription: ${reason}`, { sessionId: session.id });
    return { status: "skipped", reason };
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    const reason = `Plan not found: ${planId}`;
    logWebhookError(`Skipped subscription: ${reason}`, { sessionId: session.id });
    return { status: "skipped", reason };
  }

  const accessType = (plan.accessType === "YEARLY_SUBSCRIPTION"
    ? "YEARLY_SUBSCRIPTION"
    : "MONTHLY_SUBSCRIPTION") as "MONTHLY_SUBSCRIPTION" | "YEARLY_SUBSCRIPTION";

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
    const userAccess = await ensureActiveSubscriptionAccess(userId, existing.id, accessType);
    logWebhookDev("Subscription already fulfilled (ensured access)", {
      subscriptionId: existing.id,
      userAccessId: userAccess.id,
    });
    return {
      status: "fulfilled",
      kind: "subscription",
      subscriptionId: existing.id,
      userAccessId: userAccess.id,
      paymentId: null,
      alreadyExisted: true,
    };
  }

  const subscription = await prisma.subscription.create({
    data: {
      userId,
      planId: plan.id,
      status: "ACTIVE",
      accessType,
      priceCents: plan.priceCents,
      currency: plan.currency,
      provider: "stripe",
      stripeCustomerId:
        typeof session.customer === "string" ? session.customer : session.customer?.id,
      stripeSubscriptionId: stripeSubId,
      startsAt: new Date(),
    },
  });

  const userAccess = await grantSubscriptionAccess(userId, subscription.id, accessType);

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
    logWebhookError("Failed to create subscription notification", {
      error: String(notifyError),
    });
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
  const productId = session.metadata?.productId?.trim() || undefined;
  if (!productId) {
    const reason = "Missing productId in session metadata";
    logWebhookError(`Skipped product: ${reason}`, { sessionId: session.id });
    return { status: "skipped", reason };
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    const reason = `Product not found: ${productId}`;
    logWebhookError(`Skipped product: ${reason}`, { sessionId: session.id });
    return { status: "skipped", reason };
  }

  const accessType = (
    product.accessType === "ONE_TIME_MOCK_EXAM" || product.type === "MOCK_EXAM"
      ? "ONE_TIME_MOCK_EXAM"
      : "ONE_TIME_PAPER"
  ) as "ONE_TIME_PAPER" | "ONE_TIME_MOCK_EXAM";

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
    let userAccess = await prisma.userAccess.findFirst({
      where: { purchaseId: existingPurchase.id, status: "ACTIVE" },
    });
    if (!userAccess) {
      userAccess = await grantPurchaseAccess(
        userId,
        existingPurchase.id,
        accessType,
        product.paperId,
        product.mockExamId
      );
    }
    const payment = await prisma.payment.findFirst({
      where: { purchaseId: existingPurchase.id },
    });
    logWebhookDev("Purchase already fulfilled (ensured access)", {
      purchaseId: existingPurchase.id,
      userAccessId: userAccess.id,
    });
    return {
      status: "fulfilled",
      kind: "purchase",
      purchaseId: existingPurchase.id,
      userAccessId: userAccess.id,
      paymentId: payment?.id ?? "",
      alreadyExisted: true,
    };
  }

  const purchase = await prisma.purchase.create({
    data: {
      userId,
      productId: product.id,
      type: product.type === "PAPER" ? "ONE_TIME_PAPER" : "ONE_TIME_MOCK_EXAM",
      accessType,
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
    accessType,
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
    logWebhookError("Failed to create purchase notification", { error: String(notifyError) });
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
