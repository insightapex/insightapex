import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const updateSchema = z.object({
  targetExamDate: z.union([
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
    z.null(),
  ]),
});

/** Store calendar dates at UTC noon to avoid timezone day-shift. */
function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function serializeExamDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

async function upsertExamDate(userId: string, targetExamDate: string | null) {
  const dateValue = targetExamDate ? parseDateOnly(targetExamDate) : null;
  const existing = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (existing) {
    return prisma.studentProfile.update({
      where: { userId },
      data: { targetExamDate: dateValue },
      select: { targetExamDate: true },
    });
  }

  return prisma.studentProfile.create({
    data: { userId, targetExamDate: dateValue },
    select: { targetExamDate: true },
  });
}

export async function GET() {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      select: { targetExamDate: true },
    });

    return NextResponse.json({
      targetExamDate: serializeExamDate(profile?.targetExamDate ?? null),
    });
  } catch (error) {
    console.error("[api/profile GET]", error);
    return NextResponse.json({ error: "Could not load profile." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const profile = await upsertExamDate(user.id, parsed.data.targetExamDate);
    return NextResponse.json({
      targetExamDate: serializeExamDate(profile.targetExamDate),
    });
  } catch (error) {
    console.error("[api/profile POST]", error);
    return NextResponse.json({ error: "Could not save exam day." }, { status: 500 });
  }
}
