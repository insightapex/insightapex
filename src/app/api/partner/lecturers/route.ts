import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePartnerApi } from "@/lib/partner-auth";
import {
  isPartnerDemoStaticDataEnabled,
  PARTNER_DEMO_READ_ONLY_MESSAGE,
  partnerDemoLecturers,
} from "@/lib/partner-demo-data";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8),
  paperIds: z.array(z.string()).default([]),
  classIds: z.array(z.string()).default([]),
});

/** Partner-scoped lecturer list — never trust partnerId from client. */
export async function GET() {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (isPartnerDemoStaticDataEnabled()) {
    return NextResponse.json(partnerDemoLecturers());
  }

  const members = await prisma.partnerMember.findMany({
    where: { partnerId: ctx.partnerId, role: "LECTURER" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          lecturerPaperAssignments: {
            where: { partnerId: ctx.partnerId },
            select: {
              paperId: true,
              paper: { select: { id: true, code: true, title: true } },
            },
          },
          lecturerClassAssignments: {
            where: { partnerId: ctx.partnerId },
            select: {
              classId: true,
              class: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    lecturers: members.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      createdAt: m.user.createdAt.toISOString(),
      papers: m.user.lecturerPaperAssignments.map((a) => a.paper),
      classes: m.user.lecturerClassAssignments.map((a) => a.class),
    })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (isPartnerDemoStaticDataEnabled()) {
    return NextResponse.json({ error: PARTNER_DEMO_READ_ONLY_MESSAGE }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  if (parsed.data.paperIds.length === 0) {
    return NextResponse.json(
      { error: "Assign at least one paper for this lecturer." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
  }

  if (parsed.data.paperIds.length) {
    const papers = await prisma.paper.count({
      where: { id: { in: parsed.data.paperIds }, isActive: true },
    });
    if (papers !== parsed.data.paperIds.length) {
      return NextResponse.json({ error: "One or more papers are invalid." }, { status: 400 });
    }
  }
  if (parsed.data.classIds.length) {
    const classes = await prisma.class.count({
      where: { id: { in: parsed.data.classIds }, partnerId: ctx.partnerId },
    });
    if (classes !== parsed.data.classIds.length) {
      return NextResponse.json({ error: "One or more classes are invalid." }, { status: 400 });
    }
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const lecturer = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: parsed.data.name.trim(),
        email,
        passwordHash,
        role: "LECTURER",
        emailVerified: new Date(),
      },
    });

    await tx.partnerMember.create({
      data: {
        partnerId: ctx.partnerId,
        userId: user.id,
        role: "LECTURER",
      },
    });

    if (parsed.data.paperIds.length) {
      await tx.lecturerPaperAssignment.createMany({
        data: parsed.data.paperIds.map((paperId) => ({
          partnerId: ctx.partnerId,
          lecturerId: user.id,
          paperId,
        })),
      });
    }

    if (parsed.data.classIds.length) {
      await tx.lecturerClassAssignment.createMany({
        data: parsed.data.classIds.map((classId) => ({
          partnerId: ctx.partnerId,
          lecturerId: user.id,
          classId,
        })),
      });
    }

    return user;
  });

  return NextResponse.json(
    { lecturer: { id: lecturer.id, name: lecturer.name, email: lecturer.email } },
    { status: 201 }
  );
}
