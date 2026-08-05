import { NextRequest, NextResponse } from "next/server";
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; classId: string } }
) {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (isPartnerDemoStaticDataEnabled()) {
    return NextResponse.json({ error: PARTNER_DEMO_READ_ONLY_MESSAGE }, { status: 403 });
  }

  const { id: studentId, classId } = params;
  if (!(await assertStudentBelongsToPartner(studentId, ctx.partnerId))) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
  if (!(await assertClassBelongsToPartner(classId, ctx.partnerId))) {
    return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  await prisma.classStudent.deleteMany({
    where: { classId, studentId },
  });

  return NextResponse.json({ ok: true });
}
