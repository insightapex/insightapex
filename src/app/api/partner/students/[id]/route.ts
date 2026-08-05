import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertStudentBelongsToPartner, requirePartnerApi } from "@/lib/partner-auth";
import { hasGlobalPremiumAccess } from "@/services/access-control";
import {
  isPartnerDemoStaticDataEnabled,
  partnerDemoStudentDetail,
} from "@/lib/partner-demo-data";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = params;

  if (isPartnerDemoStaticDataEnabled()) {
    const demo = partnerDemoStudentDetail(id);
    if (!demo) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    return NextResponse.json(demo);
  }

  if (!(await assertStudentBelongsToPartner(id, ctx.partnerId))) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const student = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      emailVerified: true,
      classEnrollments: {
        where: { class: { partnerId: ctx.partnerId } },
        select: { class: { select: { id: true, name: true, status: true } } },
      },
      attempts: {
        where: { status: "SUBMITTED" },
        orderBy: { submittedAt: "desc" },
        take: 20,
        select: {
          id: true,
          scorePercent: true,
          passed: true,
          submittedAt: true,
          totalQuestions: true,
          correctCount: true,
          paper: { select: { code: true, title: true } },
        },
      },
    },
  });

  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const responses = await prisma.questionResponse.findMany({
    where: {
      attempt: { userId: id, status: "SUBMITTED" },
      isCorrect: false,
      question: { subCategoryId: { not: null } },
    },
    select: {
      question: {
        select: {
          subCategory: {
            select: {
              id: true,
              title: true,
              category: { select: { paper: { select: { code: true } } } },
            },
          },
        },
      },
    },
    take: 500,
  });

  const weakMap = new Map<string, { id: string; title: string; paperCode: string; count: number }>();
  for (const r of responses) {
    const sub = r.question.subCategory;
    if (!sub) continue;
    const row = weakMap.get(sub.id) ?? {
      id: sub.id,
      title: sub.title,
      paperCode: sub.category.paper.code,
      count: 0,
    };
    row.count += 1;
    weakMap.set(sub.id, row);
  }

  const weakAreas = Array.from(weakMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      createdAt: student.createdAt.toISOString(),
      emailVerified: Boolean(student.emailVerified),
      isPremium: await hasGlobalPremiumAccess(id),
      classes: student.classEnrollments.map((e) => e.class),
      attempts: student.attempts.map((a) => ({
        ...a,
        submittedAt: a.submittedAt?.toISOString() ?? null,
      })),
      weakAreas,
    },
  });
}
