import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parts = await prisma.part.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    include: {
      _count: {
        select: {
          papers: { where: { isActive: true } },
        },
      },
    },
  });

  return NextResponse.json(
    parts.map((part) => ({
      id: part.id,
      code: part.code,
      title: part.title,
      description: part.description,
      order: part.order,
      paperCount: part._count.papers,
    }))
  );
}
