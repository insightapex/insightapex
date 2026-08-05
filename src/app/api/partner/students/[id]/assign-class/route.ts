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

const schema = z.object({ classId: z.string().min(1) });

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (isPartnerDemoStaticDataEnabled()) {
    return NextResponse.json({ error: PARTNER_DEMO_READ_ONLY_MESSAGE }, { status: 403 });
  }

  const studentId = params.id;
  if (!(await assertStudentBelongsToPartner(studentId, ctx.partnerId))) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "classId is required" }, { status: 400 });
  }

  if (!(await assertClassBelongsToPartner(parsed.data.classId, ctx.partnerId))) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  await prisma.classStudent.upsert({
    where: {
      classId_studentId: { classId: parsed.data.classId, studentId },
    },
    create: { classId: parsed.data.classId, studentId },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
