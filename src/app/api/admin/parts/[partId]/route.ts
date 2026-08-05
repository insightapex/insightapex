import { NextResponse } from "next/server";
import { requireHierarchyReadApi, requireHierarchyWriteApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { partSchema } from "@/lib/validation/admin-content";

type RouteContext = { params: { partId: string } };

export async function GET(_req: Request, { params }: RouteContext) {
  if (!(await requireHierarchyReadApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const part = await prisma.part.findUnique({
    where: { id: params.partId },
    include: { _count: { select: { papers: true } } },
  });

  if (!part) return NextResponse.json({ error: "Part not found." }, { status: 404 });
  return NextResponse.json(part);
}

export async function PATCH(req: Request, { params }: RouteContext) {
  if (!(await requireHierarchyWriteApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = partSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (parsed.data.code) {
    const conflict = await prisma.part.findFirst({
      where: { code: parsed.data.code, NOT: { id: params.partId } },
    });
    if (conflict) {
      return NextResponse.json({ error: "A part with this code already exists." }, { status: 409 });
    }
  }

  try {
    const part = await prisma.part.update({
      where: { id: params.partId },
      data: parsed.data,
      include: { _count: { select: { papers: true } } },
    });
    return NextResponse.json(part);
  } catch {
    return NextResponse.json({ error: "Part not found." }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  if (!(await requireHierarchyWriteApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const paperCount = await prisma.paper.count({ where: { partId: params.partId } });
  if (paperCount > 0) {
    return NextResponse.json(
      { error: "Cannot delete a part that still has papers assigned." },
      { status: 400 }
    );
  }

  try {
    await prisma.part.delete({ where: { id: params.partId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Part not found." }, { status: 404 });
  }
}
