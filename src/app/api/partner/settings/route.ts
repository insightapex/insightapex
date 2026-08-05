import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePartnerApi } from "@/lib/partner-auth";
import {
  isPartnerDemoStaticDataEnabled,
  PARTNER_DEMO_READ_ONLY_MESSAGE,
  partnerDemoSettings,
} from "@/lib/partner-demo-data";

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  contactEmail: z.string().email().optional().nullable(),
  logoUrl: z.string().url().optional().nullable().or(z.literal("")),
  allowPublicRegistration: z.boolean().optional(),
});

export async function GET() {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (isPartnerDemoStaticDataEnabled()) {
    const partner = await prisma.partner.findUnique({
      where: { id: ctx.partnerId },
      select: { name: true },
    });
    return NextResponse.json(partnerDemoSettings(partner?.name));
  }

  const partner = await prisma.partner.findUnique({
    where: { id: ctx.partnerId },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      contactEmail: true,
      status: true,
      allowPublicRegistration: true,
      createdAt: true,
      _count: { select: { students: true, classes: true, members: true } },
    },
  });

  if (!partner) return NextResponse.json({ error: "Partner not found" }, { status: 404 });

  return NextResponse.json({
    partner: {
      ...partner,
      createdAt: partner.createdAt.toISOString(),
      studentCount: partner._count.students,
      classCount: partner._count.classes,
      adminCount: partner._count.members,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (isPartnerDemoStaticDataEnabled()) {
    return NextResponse.json({ error: PARTNER_DEMO_READ_ONLY_MESSAGE }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const updated = await prisma.partner.update({
    where: { id: ctx.partnerId },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.contactEmail !== undefined
        ? { contactEmail: parsed.data.contactEmail?.trim().toLowerCase() || null }
        : {}),
      ...(parsed.data.logoUrl !== undefined
        ? { logoUrl: parsed.data.logoUrl?.trim() || null }
        : {}),
      ...(parsed.data.allowPublicRegistration !== undefined
        ? { allowPublicRegistration: parsed.data.allowPublicRegistration }
        : {}),
    },
  });

  return NextResponse.json({
    partner: {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      logoUrl: updated.logoUrl,
      contactEmail: updated.contactEmail,
      status: updated.status,
      allowPublicRegistration: updated.allowPublicRegistration,
    },
  });
}
