import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

function isMissingStripeCustomer(err: unknown): boolean {
  if (err instanceof Stripe.errors.StripeInvalidRequestError) {
    if (err.code === "resource_missing") return true;
    if (/no such customer/i.test(err.message)) return true;
  }
  return false;
}

async function createStripeCustomerForUser(
  userId: string,
  email: string,
  name: string | null
): Promise<string> {
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: { userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Resolve a Stripe customer for checkout that is valid for the current
 * STRIPE_SECRET_KEY. Recreates and persists when the DB id is missing on
 * this Stripe account (common after switching test sandboxes).
 *
 * Used by subscription, paper, and mock-exam checkout.
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, email: true, name: true },
  });
  if (!user) throw new Error("User not found");

  const resolvedEmail = user.email || email;
  if (!resolvedEmail) {
    throw new Error("User email is required to create a Stripe customer");
  }

  const stripe = getStripe();

  if (user.stripeCustomerId) {
    try {
      const existing = await stripe.customers.retrieve(user.stripeCustomerId);
      if (!("deleted" in existing && existing.deleted)) {
        return existing.id;
      }
      // Soft-deleted customer: create a replacement below.
    } catch (err) {
      if (!isMissingStripeCustomer(err)) {
        throw err;
      }
      // Stale id from another Stripe account / sandbox — replace below.
    }
  }

  return createStripeCustomerForUser(userId, resolvedEmail, user.name);
}

/**
 * Retry helper when a Checkout Session create fails because the customer
 * disappeared between retrieve and session creation.
 */
export async function recreateStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!user) throw new Error("User not found");
  const resolvedEmail = user.email || email;
  if (!resolvedEmail) {
    throw new Error("User email is required to create a Stripe customer");
  }
  return createStripeCustomerForUser(userId, resolvedEmail, user.name);
}

export { isMissingStripeCustomer };
