import { NextResponse } from "next/server";
import { requireHierarchyReadApi, requireHierarchyWriteApi } from "@/lib/admin-auth";
import { ADMIN_AUDIT_ACTIONS } from "@/lib/admin-audit";
import { getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { subCategorySchema } from "@/lib/validation/admin-content";
import { logAdminAudit } from "@/services/admin/audit-log";

export async function GET(req: Request) {
  if (!(await requireHierarchyReadApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const categoryId = url.searchParams.get("categoryId");
  const paperId = url.searchParams.get("paperId");
  const search = url.searchParams.get("q") ?? "";

  const where: Record<string, unknown> = {};
  if (categoryId) where.categoryId = categoryId;
  if (paperId) where.category = { paperId };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const subCategories = await prisma.subCategory.findMany({
    where,
    orderBy: [{ order: "asc" }, { title: "asc" }],
    include: {
      category: {
        select: {
          id: true,
          title: true,
          paper: { select: { id: true, code: true, title: true } },
        },
      },
      _count: { select: { questions: true } },
    },
  });

  return NextResponse.json({ subCategories, total: subCategories.length });
}

export async function POST(req: Request) {
  const admin = await requireHierarchyWriteApi();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = subCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const subCategory = await prisma.subCategory.create({
    data: parsed.data,
    include: {
      category: {
        select: {
          id: true,
          title: true,
          paper: { select: { id: true, code: true, title: true } },
        },
      },
      _count: { select: { questions: true } },
    },
  });

  await logAdminAudit({
    userId: admin.id,
    action: ADMIN_AUDIT_ACTIONS.SUBCATEGORY_CREATED,
    target: subCategory.title,
    targetType: "subcategory",
    targetId: subCategory.id,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json(subCategory, { status: 201 });
}
