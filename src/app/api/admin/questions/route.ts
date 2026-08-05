import { NextResponse } from "next/server";
import { requireContentEditorApi } from "@/lib/admin-auth";
import { ADMIN_AUDIT_ACTIONS } from "@/lib/admin-audit";
import { getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { adminPracticeQuestionSchema } from "@/lib/validation/admin-question";
import { logAdminAudit } from "@/services/admin/audit-log";

/** Admin Practice Questions — PRACTICE purpose only */
export async function GET(req: Request) {
  if (!(await requireContentEditorApi())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const paperId = url.searchParams.get("paperId");
  const categoryId = url.searchParams.get("categoryId");
  const subCategoryId = url.searchParams.get("subCategoryId");
  const search = url.searchParams.get("q") ?? "";
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const pageSize = 25;

  const where: Record<string, unknown> = { purpose: "PRACTICE" };
  if (subCategoryId) where.subCategoryId = subCategoryId;
  else if (categoryId) where.subCategory = { categoryId };
  else if (paperId) where.subCategory = { category: { paperId } };
  if (search) where.text = { contains: search, mode: "insensitive" };

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: {
        subCategory: {
          include: {
            category: { include: { paper: { select: { code: true } } } },
          },
        },
        options: { orderBy: { order: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.question.count({ where }),
  ]);

  return NextResponse.json({ questions, total, page, pageSize });
}

export async function POST(req: Request) {
  const admin = await requireContentEditorApi();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = adminPracticeQuestionSchema.safeParse({ ...body, purpose: "PRACTICE" });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const { options, purpose: _purpose, ...rest } = parsed.data;
  const question = await prisma.question.create({
    data: {
      ...rest,
      purpose: "PRACTICE",
      options: { create: options },
    },
    include: { options: true },
  });

  await logAdminAudit({
    userId: admin.id,
    action: ADMIN_AUDIT_ACTIONS.QUESTION_CREATED,
    target: question.text.slice(0, 120),
    targetType: "question",
    targetId: question.id,
    ipAddress: getClientIp(req),
  });

  return NextResponse.json(question, { status: 201 });
}
