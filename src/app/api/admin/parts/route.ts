import { NextResponse } from "next/server";
import { requireHierarchyReadApi, requireHierarchyWriteApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { partSchema } from "@/lib/validation/admin-content";

export async function GET(req: Request) {
  if (!(await requireHierarchyReadApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("q") ?? "";

  const where = search
    ? {
        OR: [
          { code: { contains: search, mode: "insensitive" as const } },
          { title: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const parts = await prisma.part.findMany({
    where,
    orderBy: [{ order: "asc" }, { title: "asc" }],
    include: { _count: { select: { papers: true } } },
  });

  return NextResponse.json({ parts, total: parts.length });
}

export async function POST(req: Request) {
  if (!(await requireHierarchyWriteApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = partSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const existing = await prisma.part.findUnique({ where: { code: parsed.data.code } });
  if (existing) {
    return NextResponse.json({ error: "A part with this code already exists." }, { status: 409 });
  }

  const part = await prisma.part.create({ data: parsed.data });
  return NextResponse.json(part, { status: 201 });
}
