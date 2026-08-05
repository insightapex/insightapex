import { NextResponse } from "next/server";
import { requireContentEditorApi } from "@/lib/admin-auth";
import { ADMIN_AUDIT_ACTIONS } from "@/lib/admin-audit";
import { getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { adminPracticeQuestionSchema } from "@/lib/validation/admin-question";
import { logAdminAudit } from "@/services/admin/audit-log";

export async function GET(
  _req: Request,
  { params }: { params: { questionId: string } }
) {
  if (!(await requireContentEditorApi())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const question = await prisma.question.findFirst({
    where: { id: params.questionId, purpose: "PRACTICE" },
    include: {
      subCategory: {
        include: {
          category: { include: { paper: { select: { id: true, code: true, title: true, partId: true } } } },
        },
      },
      options: { orderBy: { order: "asc" } },
    },
  });

  if (!question) return NextResponse.json({ error: "Practice question not found" }, { status: 404 });
  return NextResponse.json(question);
}

export async function PATCH(
  req: Request,
  { params }: { params: { questionId: string } }
) {
  const admin = await requireContentEditorApi();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const existing = await prisma.question.findFirst({
    where: { id: params.questionId, purpose: "PRACTICE" },
  });
  if (!existing) return NextResponse.json({ error: "Practice question not found" }, { status: 404 });

  const body = await req.json();
  const parsed = adminPracticeQuestionSchema.safeParse({ ...body, purpose: "PRACTICE" });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { options, purpose: _purpose, ...rest } = parsed.data;

  const question = await prisma.$transaction(async (tx) => {
    await tx.answerOption.deleteMany({ where: { questionId: params.questionId } });
    return tx.question.update({
      where: { id: params.questionId },
      data: {
        ...rest,
        purpose: "PRACTICE",
        options: { create: options },
      },
      include: {
        subCategory: {
          include: {
            category: { include: { paper: { select: { id: true, code: true } } } },
          },
        },
        options: { orderBy: { order: "asc" } },
      },
    });
  });

  await logAdminAudit({
    userId: admin.id,
    action: ADMIN_AUDIT_ACTIONS.QUESTION_UPDATED,
    target: question.text.slice(0, 120),
    targetType: "question",
    targetId: question.id,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json(question);
}

export async function DELETE(
  req: Request,
  { params }: { params: { questionId: string } }
) {
  const admin = await requireContentEditorApi();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const existing = await prisma.question.findFirst({
    where: { id: params.questionId, purpose: "PRACTICE" },
  });
  if (!existing) return NextResponse.json({ error: "Practice question not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.questionResponse.deleteMany({ where: { questionId: params.questionId } });
    await tx.question.delete({ where: { id: params.questionId } });
  });

  await logAdminAudit({
    userId: admin.id,
    action: ADMIN_AUDIT_ACTIONS.QUESTION_DELETED,
    target: existing.text.slice(0, 120),
    targetType: "question",
    targetId: params.questionId,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json({ success: true });
}
