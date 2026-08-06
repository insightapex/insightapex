import { prisma } from "@/lib/prisma";
import { getAppUrl, getStripe } from "@/lib/stripe";
import {
  getOrCreateStripeCustomer,
  isMissingStripeCustomer,
  recreateStripeCustomer,
} from "./stripe-customer";
import { STRIPE_PRICE_NOT_CONFIGURED } from "./errors";

type CheckoutType = "subscription" | "paper" | "mock_exam";

async function withValidStripeCustomer(
  userId: string,
  email: string,
  createSession: (customerId: string) => Promise<{ url: string | null }>
): Promise<string> {
  let customerId = await getOrCreateStripeCustomer(userId, email);

  try {
    const session = await createSession(customerId);
    if (!session.url) throw new Error("Failed to create checkout session");
    return session.url;
  } catch (err) {
    // Race / deleted customer after retrieve: create once and retry.
    if (!isMissingStripeCustomer(err)) throw err;
    customerId = await recreateStripeCustomer(userId, email);
    const session = await createSession(customerId);
    if (!session.url) throw new Error("Failed to create checkout session");
    return session.url;
  }
}

export async function createSubscriptionCheckout(
  userId: string,
  email: string,
  planId: string
): Promise<string> {
  const plan = await prisma.plan.findFirst({
    where: { id: planId, isActive: true },
  });
  if (!plan) {
    throw new Error("Plan not available for checkout");
  }
  if (!plan.providerPriceId) {
    throw new Error(STRIPE_PRICE_NOT_CONFIGURED);
  }
  if (plan.accessType === "FREE") {
    throw new Error("Free plan does not require checkout");
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();

  const metadata = {
    userId,
    planId: plan.id,
    productId: "",
    purchaseType: "SUBSCRIPTION",
    checkoutType: "subscription",
    type: "subscription",
  };

  return withValidStripeCustomer(userId, email, (customerId) =>
    stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.providerPriceId!, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/billing/cancelled`,
      subscription_data: {
        metadata: {
          userId,
          planId: plan.id,
          productId: "",
          purchaseType: "SUBSCRIPTION",
          checkoutType: "subscription",
        },
      },
      metadata,
    })
  );
}

export async function createProductCheckout(
  userId: string,
  email: string,
  productId: string
): Promise<string> {
  const product = await prisma.product.findFirst({
    where: { id: productId, isActive: true },
  });
  if (!product) {
    throw new Error("Product not available for checkout");
  }
  if (!product.providerPriceId) {
    throw new Error(STRIPE_PRICE_NOT_CONFIGURED);
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();

  const checkoutType: CheckoutType =
    product.type === "PAPER" ? "paper" : "mock_exam";

  const purchaseType =
    product.type === "PAPER" ? "ONE_TIME_PAPER" : "ONE_TIME_MOCK_EXAM";

  return withValidStripeCustomer(userId, email, (customerId) =>
    stripe.checkout.sessions.create({
      mode: "payment",
      customer: customerId,
      line_items: [{ price: product.providerPriceId!, quantity: 1 }],
      success_url: `${appUrl}/dashboard/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/billing/cancelled`,
      metadata: {
        userId,
        type: checkoutType,
        checkoutType,
        planId: "",
        productId: product.id,
        purchaseType,
        paperId: product.paperId ?? "",
        mockExamId: product.mockExamId ?? "",
      },
    })
  );
}
