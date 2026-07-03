import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { priceCents: "asc" },
  });

  return NextResponse.json(
    plans.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      accessType: p.accessType,
      priceCents: p.priceCents,
      currency: p.currency,
      billingInterval: p.billingInterval,
      features: p.features,
      isActive: p.isActive,
      hasStripePrice: Boolean(p.providerPriceId),
    }))
  );
}
