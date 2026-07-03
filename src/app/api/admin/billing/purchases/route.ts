import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireAdminApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true } },
      product: { select: { id: true, name: true, type: true } },
      paper: { select: { id: true, code: true, title: true } },
      mockExam: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(purchases);
}
