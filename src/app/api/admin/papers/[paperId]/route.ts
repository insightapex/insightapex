import { NextResponse } from "next/server";
import { requireHierarchyReadApi, requireHierarchyWriteApi } from "@/lib/admin-auth";
import { ADMIN_AUDIT_ACTIONS } from "@/lib/admin-audit";
import { getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { paperSchema } from "@/lib/validation/admin-content";
import { logAdminAudit } from "@/services/admin/audit-log";
type RouteContext = { params: { paperId: string } };

export async function GET(_req: Request, { params }: RouteContext) {
  if (!(await requireHierarchyReadApi())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const paper = await prisma.paper.findUnique({
    where: { id: params.paperId },
    include: {
      part: { select: { id: true, code: true, title: true } },
      _count: { select: { categories: true, attempts: true } },
    },
  });

  if (!paper) return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  return NextResponse.json(paper);
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const admin = await requireHierarchyWriteApi();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const parsed = paperSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (parsed.data.partId) {
    const part = await prisma.part.findUnique({ where: { id: parsed.data.partId } });
    if (!part) return NextResponse.json({ error: "Part not found." }, { status: 400 });
  }

  if (parsed.data.code) {
    const conflict = await prisma.paper.findFirst({
      where: { code: parsed.data.code, NOT: { id: params.paperId } },
    });
    if (conflict) {
      return NextResponse.json({ error: "A paper with this code already exists." }, { status: 409 });
    }
  }

  try {
    const paper = await prisma.paper.update({
      where: { id: params.paperId },
      data: parsed.data,
      include: {
        part: { select: { id: true, code: true, title: true } },
        _count: { select: { categories: true, attempts: true } },
      },
    });
    await logAdminAudit({
      userId: admin.id,
      action: ADMIN_AUDIT_ACTIONS.PAPER_UPDATED,
      target: `${paper.code} – ${paper.title}`,
      targetType: "paper",
      targetId: paper.id,
      ipAddress: getClientIp(req),
    });
    return NextResponse.json(paper);  } catch {
    return NextResponse.json({ error: "Paper not found." }, { status: 404 });
  }
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const admin = await requireHierarchyWriteApi();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const paper = await prisma.paper.findUnique({
    where: { id: params.paperId },
    include: { _count: { select: { categories: true } } },
  });

  if (!paper) return NextResponse.json({ error: "Paper not found." }, { status: 404 });

  if (paper._count.categories > 0) {
    return NextResponse.json(
      { error: `Cannot delete: this paper has ${paper._count.categories} categor(ies).` },
      { status: 400 }
    );
  }

  await prisma.paper.delete({ where: { id: params.paperId } });
  await logAdminAudit({
    userId: admin.id,
    action: ADMIN_AUDIT_ACTIONS.PAPER_DELETED,
    target: `${paper.code} – ${paper.title}`,
    targetType: "paper",
    targetId: paper.id,
    ipAddress: getClientIp(req),
  });
  return NextResponse.json({ ok: true });
}