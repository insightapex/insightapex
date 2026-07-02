import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const isAdmin = async () => {
  const s = await getServerSession(authOptions);
  return s?.user && (s.user as any).role === "ADMIN";
};

export async function GET() {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const papers = await prisma.paper.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { topics: true, attempts: true } } },
  });

  return NextResponse.json(papers);
}

const paperSchema = z.object({
  code: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  accessLevel: z.enum(["FREE", "PREMIUM"]).default("FREE"),
  isActive: z.boolean().default(true),
  order: z.number().int().default(0),
});

export async function POST(req: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = paperSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const paper = await prisma.paper.create({ data: parsed.data });
  return NextResponse.json(paper, { status: 201 });
}
