import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePartnerApi } from "@/lib/partner-auth";
import { getClassPerformance } from "@/services/partner/analytics";
import {
  isPartnerDemoStaticDataEnabled,
  PARTNER_DEMO_READ_ONLY_MESSAGE,
  partnerDemoClasses,
} from "@/lib/partner-demo-data";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
});

export async function GET() {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (isPartnerDemoStaticDataEnabled()) {
    return NextResponse.json(partnerDemoClasses());
  }

  const classes = await prisma.class.findMany({
    where: { partnerId: ctx.partnerId },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { students: true } },
    },
  });

  const withPerf = await Promise.all(
    classes.map(async (c) => {
      const perf = await getClassPerformance(ctx.partnerId, c.id);
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
        studentCount: c._count.students,
        passRate: perf?.passRate ?? 0,
        totalAttempts: perf?.totalAttempts ?? 0,
      };
    })
  );

  return NextResponse.json({ classes: withPerf });
}

export async function POST(req: NextRequest) {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (isPartnerDemoStaticDataEnabled()) {
    return NextResponse.json({ error: PARTNER_DEMO_READ_ONLY_MESSAGE }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const cls = await prisma.class.create({
    data: {
      partnerId: ctx.partnerId,
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
    },
  });

  return NextResponse.json({ class: cls }, { status: 201 });
}
