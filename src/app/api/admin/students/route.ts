import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("q") ?? "";
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const pageSize = 20;

  const where = search
    ? { role: "STUDENT" as const, OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ]}
    : { role: "STUDENT" as const };

  const [students, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, name: true, email: true, emailVerified: true, createdAt: true,
        _count: { select: { attempts: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ students, total, page, pageSize });
}
