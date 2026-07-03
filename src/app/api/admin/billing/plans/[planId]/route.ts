import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { planPatchSchema } from "@/lib/validation/billing";

export async function GET(_req: Request, { params }: { params: { planId: string } }) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const plan = await prisma.plan.findUnique({ where: { id: params.planId } });
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  return NextResponse.json(plan);
}

function buildPlanPatchData(parsed: {
  name?: string;
  priceCents?: number;
  isActive?: boolean;
  providerProductId?: string | null;
  providerPriceId?: string | null;
}): Prisma.PlanUpdateInput {
  const data: Prisma.PlanUpdateInput = {};

  if (parsed.name !== undefined) data.name = parsed.name;
  if (parsed.priceCents !== undefined) data.priceCents = parsed.priceCents;
  if (parsed.isActive !== undefined) data.isActive = parsed.isActive;
  if (parsed.providerProductId !== undefined) data.providerProductId = parsed.providerProductId;
  if (parsed.providerPriceId !== undefined) {
    data.providerPriceId = parsed.providerPriceId;
    data.provider = parsed.providerPriceId ? "stripe" : null;
  }

  return data;
}

export async function PATCH(req: Request, { params }: { params: { planId: string } }) {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.plan.findUnique({ where: { id: params.planId } });
  if (!existing) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const body = await req.json();
  const parsed = planPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const plan = await prisma.plan.update({
      where: { id: params.planId },
      data: buildPlanPatchData(parsed.data),
      include: { _count: { select: { subscriptions: true } } },
    });

    return NextResponse.json(plan);
  } catch (err) {
    console.error("Failed to update plan:", err);
    const message =
      err instanceof Prisma.PrismaClientValidationError
        ? "Database client is out of date. Stop the dev server, run `npx prisma generate`, then restart."
        : "Failed to update plan.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
