import { NextResponse } from "next/server";
import { requireHierarchyReadApi, requireHierarchyWriteApi } from "@/lib/admin-auth";
import { ADMIN_AUDIT_ACTIONS } from "@/lib/admin-audit";
import { getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validation/admin-content";
import { logAdminAudit } from "@/services/admin/audit-log";

export async function GET(req: Request) {
  if (!(await requireHierarchyReadApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const paperId = url.searchParams.get("paperId");
  const search = url.searchParams.get("q") ?? "";

  const where: Record<string, unknown> = {};
  if (paperId) where.paperId = paperId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const categories = await prisma.category.findMany({
    where,
    orderBy: [{ order: "asc" }, { title: "asc" }],
    include: {
      paper: { select: { id: true, code: true, title: true } },
      _count: { select: { subCategories: true } },
    },
  });

  return NextResponse.json({ categories, total: categories.length });
}

export async function POST(req: Request) {
  const admin = await requireHierarchyWriteApi();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: parsed.data,
    include: {
      paper: { select: { id: true, code: true, title: true } },
      _count: { select: { subCategories: true } },
    },
  });

  await logAdminAudit({
    userId: admin.id,
    action: ADMIN_AUDIT_ACTIONS.CATEGORY_CREATED,
    target: category.title,
    targetType: "category",
    targetId: category.id,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json(category, { status: 201 });
}
