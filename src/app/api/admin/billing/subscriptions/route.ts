import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscriptions = await prisma.subscription.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true } },
      plan: { select: { id: true, name: true, slug: true, billingInterval: true } },
    },
  });

  return NextResponse.json(subscriptions);
}
