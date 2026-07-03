import { z } from "zod";

export const planSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  accessType: z.enum(["FREE", "MONTHLY_SUBSCRIPTION", "YEARLY_SUBSCRIPTION"]),
  priceCents: z.number().int().min(0),
  currency: z.string().default("GBP"),
  billingInterval: z.enum(["MONTHLY", "YEARLY", "ONE_TIME"]),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  providerProductId: z.string().optional().nullable(),
  providerPriceId: z.string().optional().nullable(),
});

export const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  type: z.enum(["PAPER", "MOCK_EXAM"]),
  accessType: z.enum(["ONE_TIME_PAPER", "ONE_TIME_MOCK_EXAM"]),
  priceCents: z.number().int().min(0),
  currency: z.string().default("GBP"),
  isActive: z.boolean().default(true),
  isPremium: z.boolean().default(true),
  paperId: z.string().optional().nullable(),
  mockExamId: z.string().optional().nullable(),
  providerProductId: z.string().optional().nullable(),
  providerPriceId: z.string().optional().nullable(),
});

export const checkoutSubscriptionSchema = z.object({
  planId: z.string(),
});

export const checkoutProductSchema = z.object({
  productId: z.string(),
});

/** Fields allowed when editing a plan from the admin UI */
export const planPatchSchema = z.object({
  name: z.string().min(1).optional(),
  priceCents: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  providerProductId: z.string().nullable().optional(),
  providerPriceId: z.string().nullable().optional(),
});

/** Fields allowed when editing a product from the admin UI */
export const productPatchSchema = z.object({
  name: z.string().min(1).optional(),
  priceCents: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  providerProductId: z.string().nullable().optional(),
  providerPriceId: z.string().nullable().optional(),
});
