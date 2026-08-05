import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertClassBelongsToPartner, requirePartnerApi } from "@/lib/partner-auth";
import { getClassPerformance } from "@/services/partner/analytics";
import {
  isPartnerDemoStaticDataEnabled,
  PARTNER_DEMO_READ_ONLY_MESSAGE,
  partnerDemoClassDetail,
} from "@/lib/partner-demo-data";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (isPartnerDemoStaticDataEnabled()) {
    const demo = partnerDemoClassDetail(params.id);
    if (!demo) return NextResponse.json({ error: "Class not found" }, { status: 404 });
    return NextResponse.json(demo);
  }

  if (!(await assertClassBelongsToPartner(params.id, ctx.partnerId))) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const cls = await prisma.class.findFirst({
    where: { id: params.id, partnerId: ctx.partnerId },
    include: {
      students: {
        include: {
          student: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const performance = await getClassPerformance(ctx.partnerId, cls.id);

  return NextResponse.json({
    class: {
      id: cls.id,
      name: cls.name,
      description: cls.description,
      status: cls.status,
      createdAt: cls.createdAt.toISOString(),
      students: cls.students.map((s) => ({
        id: s.student.id,
        name: s.student.name,
        email: s.student.email,
        enrolledAt: s.createdAt.toISOString(),
      })),
      performance,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (isPartnerDemoStaticDataEnabled()) {
    return NextResponse.json({ error: PARTNER_DEMO_READ_ONLY_MESSAGE }, { status: 403 });
  }

  if (!(await assertClassBelongsToPartner(params.id, ctx.partnerId))) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.class.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description?.trim() || null }
        : {}),
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
    },
  });

  return NextResponse.json({ class: updated });
}
