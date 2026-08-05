import { NextResponse } from "next/server";
import { requireHierarchyReadApi, requireHierarchyWriteApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validation/admin-content";

export async function GET(
  _req: Request,
  { params }: { params: { categoryId: string } }
) {
  if (!(await requireHierarchyReadApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const category = await prisma.category.findUnique({
    where: { id: params.categoryId },
    include: {
      paper: { select: { id: true, code: true, title: true } },
      _count: { select: { subCategories: true } },
    },
  });

  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  return NextResponse.json(category);
}

export async function PATCH(
  req: Request,
  { params }: { params: { categoryId: string } }
) {
  if (!(await requireHierarchyWriteApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.category.findUnique({ where: { id: params.categoryId } });
  if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  const body = await req.json();
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const category = await prisma.category.update({
    where: { id: params.categoryId },
    data: parsed.data,
    include: {
      paper: { select: { id: true, code: true, title: true } },
      _count: { select: { subCategories: true } },
    },
  });

  return NextResponse.json(category);
}

export async function DELETE(
  _req: Request,
  { params }: { params: { categoryId: string } }
) {
  if (!(await requireHierarchyWriteApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const category = await prisma.category.findUnique({
    where: { id: params.categoryId },
    include: { _count: { select: { subCategories: true } } },
  });

  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  if (category._count.subCategories > 0) {
    return NextResponse.json(
      { error: `Cannot delete: this category has ${category._count.subCategories} sub categor(ies).` },
      { status: 400 }
    );
  }

  await prisma.category.delete({ where: { id: params.categoryId } });
  return NextResponse.json({ success: true });
}
