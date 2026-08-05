import { NextResponse } from "next/server";
import { requireHierarchyReadApi, requireHierarchyWriteApi } from "@/lib/admin-auth";
import { ADMIN_AUDIT_ACTIONS } from "@/lib/admin-audit";
import { getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { paperSchema } from "@/lib/validation/admin-content";
import { logAdminAudit } from "@/services/admin/audit-log";
export async function GET(req: Request) {
  if (!(await requireHierarchyReadApi())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const partId = url.searchParams.get("partId");

  const papers = await prisma.paper.findMany({
    where: partId ? { partId } : undefined,
    orderBy: [{ part: { order: "asc" } }, { code: "asc" }],
    include: {
      part: { select: { id: true, code: true, title: true } },
      _count: { select: { categories: true, attempts: true } },
    },
  });

  return NextResponse.json(papers);
}

export async function POST(req: Request) {
  const admin = await requireHierarchyWriteApi();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = paperSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const part = await prisma.part.findUnique({ where: { id: parsed.data.partId } });
  if (!part) return NextResponse.json({ error: "Part not found." }, { status: 400 });

  const paper = await prisma.paper.create({ data: parsed.data });
  await logAdminAudit({
    userId: admin.id,
    action: ADMIN_AUDIT_ACTIONS.PAPER_CREATED,
    target: `${paper.code} – ${paper.title}`,
    targetType: "paper",
    targetId: paper.id,
    ipAddress: getClientIp(req),
  });
  return NextResponse.json(paper, { status: 201 });
}
