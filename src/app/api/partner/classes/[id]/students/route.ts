import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  assertClassBelongsToPartner,
  assertStudentBelongsToPartner,
  requirePartnerApi,
} from "@/lib/partner-auth";
import {
  isPartnerDemoStaticDataEnabled,
  PARTNER_DEMO_READ_ONLY_MESSAGE,
} from "@/lib/partner-demo-data";

const schema = z.object({ studentId: z.string().min(1) });

export async function POST(
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

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  if (!(await assertStudentBelongsToPartner(parsed.data.studentId, ctx.partnerId))) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  await prisma.classStudent.upsert({
    where: {
      classId_studentId: { classId: params.id, studentId: parsed.data.studentId },
    },
    create: { classId: params.id, studentId: parsed.data.studentId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
