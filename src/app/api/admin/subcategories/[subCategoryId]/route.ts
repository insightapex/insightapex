import { NextResponse } from "next/server";
import { requireHierarchyReadApi, requireHierarchyWriteApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { subCategorySchema } from "@/lib/validation/admin-content";

export async function GET(
  _req: Request,
  { params }: { params: { subCategoryId: string } }
) {
  if (!(await requireHierarchyReadApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const subCategory = await prisma.subCategory.findUnique({
    where: { id: params.subCategoryId },
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

  if (!subCategory) return NextResponse.json({ error: "Sub Category not found" }, { status: 404 });
  return NextResponse.json(subCategory);
}

export async function PATCH(
  req: Request,
  { params }: { params: { subCategoryId: string } }
) {
  if (!(await requireHierarchyWriteApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.subCategory.findUnique({ where: { id: params.subCategoryId } });
  if (!existing) return NextResponse.json({ error: "Sub Category not found" }, { status: 404 });

  const body = await req.json();
  const parsed = subCategorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const subCategory = await prisma.subCategory.update({
    where: { id: params.subCategoryId },
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

  return NextResponse.json(subCategory);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { subCategoryId: string } }
) {
  if (!(await requireHierarchyWriteApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const subCategory = await prisma.subCategory.findUnique({
    where: { id: params.subCategoryId },
    include: { _count: { select: { questions: true } } },
  });

  if (!subCategory) return NextResponse.json({ error: "Sub Category not found" }, { status: 404 });

  if (subCategory._count.questions > 0) {
    return NextResponse.json(
      { error: `Cannot delete: this sub category has ${subCategory._count.questions} question(s).` },
      { status: 400 }
    );
  }

  await prisma.subCategory.delete({ where: { id: params.subCategoryId } });
  return NextResponse.json({ success: true });
}
