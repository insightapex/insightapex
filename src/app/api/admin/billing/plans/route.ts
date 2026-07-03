import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { planSchema } from "@/lib/validation/billing";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plans = await prisma.plan.findMany({
    orderBy: { priceCents: "asc" },
    include: { _count: { select: { subscriptions: true } } },
  });

  return NextResponse.json(plans);
}

export async function POST(req: Request) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const existing = await prisma.plan.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return NextResponse.json({ error: "A plan with this slug already exists." }, { status: 409 });
  }

  const plan = await prisma.plan.create({
    data: {
      ...parsed.data,
      provider: parsed.data.providerPriceId ? "stripe" : null,
    },
  });

  return NextResponse.json(plan, { status: 201 });
}
