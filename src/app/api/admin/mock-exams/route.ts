import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { mockExamSchema } from "@/lib/validation/admin-content";

export async function GET(req: Request) {
  if (!(await requireAdminApi())) {
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

  const mockExams = await prisma.mockExam.findMany({
    where,
    orderBy: [{ order: "asc" }, { title: "asc" }],
    include: {
      paper: { select: { id: true, code: true, title: true } },
      _count: { select: { questions: true } },
    },
  });

  return NextResponse.json({ mockExams, total: mockExams.length });
}

export async function POST(req: Request) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = mockExamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  if (parsed.data.status === "PUBLISHED") {
    return NextResponse.json(
      { error: "Create as draft first, then add questions and publish." },
      { status: 400 }
    );
  }

  const mockExam = await prisma.mockExam.create({
    data: {
      ...parsed.data,
      status: "DRAFT",
    },
    include: {
      paper: { select: { id: true, code: true, title: true } },
      _count: { select: { questions: true } },
    },
  });

  return NextResponse.json(mockExam, { status: 201 });
}
