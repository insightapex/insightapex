import { NextResponse } from "next/server";
import { requireLecturerApi } from "@/lib/lecturer-auth";
import { prisma } from "@/lib/prisma";
import {
  isLecturerDemoStaticDataEnabled,
  lecturerDemoClasses,
} from "@/lib/lecturer-demo-data";

export async function GET() {
  const ctx = await requireLecturerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (isLecturerDemoStaticDataEnabled()) {
    return NextResponse.json(lecturerDemoClasses());
  }

  if (ctx.classIds.length === 0) {
    return NextResponse.json({ classes: [] });
  }

  const classes = await prisma.class.findMany({
    where: {
      id: { in: ctx.classIds },
      partnerId: ctx.partnerId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      _count: { select: { students: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    classes: classes.map((c) => ({
      id: c.id,
      name: c.name,
      studentCount: c._count.students,
    })),
  });
}
