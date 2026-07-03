import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { topicSchema } from "@/lib/validation/admin-content";

export async function GET(
  _req: Request,
  { params }: { params: { topicId: string } }
) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const topic = await prisma.topic.findUnique({
    where: { id: params.topicId },
    include: {
      paper: { select: { id: true, code: true, title: true } },
      _count: { select: { questions: true } },
    },
  });

  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  return NextResponse.json(topic);
}

export async function PATCH(
  req: Request,
  { params }: { params: { topicId: string } }
) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.topic.findUnique({ where: { id: params.topicId } });
  if (!existing) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

  const body = await req.json();
  const parsed = topicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const topic = await prisma.topic.update({
    where: { id: params.topicId },
    data: parsed.data,
    include: {
      paper: { select: { id: true, code: true, title: true } },
      _count: { select: { questions: true } },
    },
  });

  return NextResponse.json(topic);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { topicId: string } }
) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const topic = await prisma.topic.findUnique({
    where: { id: params.topicId },
    include: { _count: { select: { questions: true } } },
  });

  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

  if (topic._count.questions > 0) {
    return NextResponse.json(
      {
        error: `Cannot delete: this topic has ${topic._count.questions} question(s). Disable it instead.`,
      },
      { status: 400 }
    );
  }

  await prisma.topic.delete({ where: { id: params.topicId } });
  return NextResponse.json({ success: true });
}
