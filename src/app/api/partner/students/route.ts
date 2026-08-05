import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePartnerApi } from "@/lib/partner-auth";
import { hasGlobalPremiumAccess } from "@/services/access-control";
import {
  isPartnerDemoStaticDataEnabled,
  partnerDemoStudents,
} from "@/lib/partner-demo-data";

export async function GET(req: NextRequest) {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const classId = req.nextUrl.searchParams.get("classId");
  const premium = req.nextUrl.searchParams.get("premium");

  if (isPartnerDemoStaticDataEnabled()) {
    return NextResponse.json(partnerDemoStudents({ q, classId, premium }));
  }

  let studentIdsFilter: string[] | undefined;
  if (classId) {
    const cls = await prisma.class.findFirst({
      where: { id: classId, partnerId: ctx.partnerId },
      include: { students: { select: { studentId: true } } },
    });
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });
    studentIdsFilter = cls.students.map((s) => s.studentId);
  }

  const students = await prisma.user.findMany({
    where: {
      partnerId: ctx.partnerId,
      role: "STUDENT",
      ...(studentIdsFilter ? { id: { in: studentIdsFilter } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      emailVerified: true,
      classEnrollments: {
        where: { class: { partnerId: ctx.partnerId } },
        select: {
          class: { select: { id: true, name: true, status: true } },
        },
      },
      _count: {
        select: { attempts: { where: { status: "SUBMITTED" } } },
      },
    },
  });

  const withPremium = await Promise.all(
    students.map(async (s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      createdAt: s.createdAt.toISOString(),
      emailVerified: Boolean(s.emailVerified),
      attemptCount: s._count.attempts,
      classes: s.classEnrollments.map((e) => e.class),
      isPremium: await hasGlobalPremiumAccess(s.id),
    }))
  );

  const filtered =
    premium === "true"
      ? withPremium.filter((s) => s.isPremium)
      : premium === "false"
        ? withPremium.filter((s) => !s.isPremium)
        : withPremium;

  return NextResponse.json({ students: filtered });
}
