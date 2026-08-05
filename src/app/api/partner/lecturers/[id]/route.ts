import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePartnerApi } from "@/lib/partner-auth";
import {
  isPartnerDemoStaticDataEnabled,
  PARTNER_DEMO_READ_ONLY_MESSAGE,
} from "@/lib/partner-demo-data";

const assignSchema = z.object({
  paperIds: z.array(z.string()).optional(),
  classIds: z.array(z.string()).optional(),
});

async function assertLecturerInPartner(lecturerId: string, partnerId: string) {
  return prisma.partnerMember.findFirst({
    where: { userId: lecturerId, partnerId, role: "LECTURER" },
    select: { id: true },
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

  const membership = await assertLecturerInPartner(params.id, ctx.partnerId);
  if (!membership) return NextResponse.json({ error: "Lecturer not found" }, { status: 404 });

  const parsed = assignSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  if (parsed.data.paperIds) {
    if (parsed.data.paperIds.length === 0) {
      return NextResponse.json(
        { error: "Assign at least one paper for this lecturer." },
        { status: 400 }
      );
    }
    const papers = await prisma.paper.count({
      where: { id: { in: parsed.data.paperIds }, isActive: true },
    });
    if (papers !== parsed.data.paperIds.length) {
      return NextResponse.json({ error: "One or more papers are invalid." }, { status: 400 });
    }
    await prisma.$transaction([
      prisma.lecturerPaperAssignment.deleteMany({
        where: { lecturerId: params.id, partnerId: ctx.partnerId },
      }),
      prisma.lecturerPaperAssignment.createMany({
        data: parsed.data.paperIds.map((paperId) => ({
          partnerId: ctx.partnerId,
          lecturerId: params.id,
          paperId,
        })),
      }),
    ]);
  }

  if (parsed.data.classIds) {
    const classes = await prisma.class.count({
      where: { id: { in: parsed.data.classIds }, partnerId: ctx.partnerId },
    });
    if (classes !== parsed.data.classIds.length) {
      return NextResponse.json({ error: "One or more classes are invalid." }, { status: 400 });
    }
    await prisma.$transaction([
      prisma.lecturerClassAssignment.deleteMany({
        where: { lecturerId: params.id, partnerId: ctx.partnerId },
      }),
      prisma.lecturerClassAssignment.createMany({
        data: parsed.data.classIds.map((classId) => ({
          partnerId: ctx.partnerId,
          lecturerId: params.id,
          classId,
        })),
      }),
    ]);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (isPartnerDemoStaticDataEnabled()) {
    return NextResponse.json({ error: PARTNER_DEMO_READ_ONLY_MESSAGE }, { status: 403 });
  }

  const membership = await assertLecturerInPartner(params.id, ctx.partnerId);
  if (!membership) return NextResponse.json({ error: "Lecturer not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.lecturerPaperAssignment.deleteMany({
      where: { lecturerId: params.id, partnerId: ctx.partnerId },
    });
    await tx.lecturerClassAssignment.deleteMany({
      where: { lecturerId: params.id, partnerId: ctx.partnerId },
    });
    await tx.partnerMember.deleteMany({
      where: { userId: params.id, partnerId: ctx.partnerId, role: "LECTURER" },
    });
    await tx.user.update({
      where: { id: params.id },
      data: { role: "STUDENT" },
    });
  });

  return NextResponse.json({ ok: true });
}
