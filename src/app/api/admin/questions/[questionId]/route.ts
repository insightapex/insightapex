import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminQuestionSchema } from "@/lib/validation/admin-question";

const isAdmin = async () => {
  const s = await getServerSession(authOptions);
  return s?.user && (s.user as { role?: string }).role === "ADMIN";
};

export async function GET(
  _req: Request,
  { params }: { params: { questionId: string } }
) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const question = await prisma.question.findUnique({
    where: { id: params.questionId },
    include: {
      topic: { include: { paper: { select: { id: true, code: true, title: true } } } },
      options: { orderBy: { order: "asc" } },
    },
  });

  if (!question) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  return NextResponse.json(question);
}

export async function PATCH(
  req: Request,
  { params }: { params: { questionId: string } }
) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.question.findUnique({ where: { id: params.questionId } });
  if (!existing) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  const body = await req.json();
  const parsed = adminQuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { options, ...rest } = parsed.data;

  const question = await prisma.$transaction(async (tx) => {
    await tx.answerOption.deleteMany({ where: { questionId: params.questionId } });
    return tx.question.update({
      where: { id: params.questionId },
      data: {
        ...rest,
        options: { create: options },
      },
      include: {
        topic: { include: { paper: { select: { id: true, code: true } } } },
        options: { orderBy: { order: "asc" } },
      },
    });
  });

  return NextResponse.json(question);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { questionId: string } }
) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const existing = await prisma.question.findUnique({ where: { id: params.questionId } });
  if (!existing) return NextResponse.json({ error: "Question not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.questionResponse.deleteMany({ where: { questionId: params.questionId } });
    await tx.question.delete({ where: { id: params.questionId } });
  });

  return NextResponse.json({ success: true });
}
