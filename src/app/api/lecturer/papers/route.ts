import { NextResponse } from "next/server";
import { requireLecturerApi } from "@/lib/lecturer-auth";
import { getLecturerAssignedPapers } from "@/services/lecturer/dashboard";

export async function GET() {
  const ctx = await requireLecturerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await getLecturerAssignedPapers(ctx);
  return NextResponse.json({
    school: { id: ctx.partnerId, name: ctx.partnerName },
    ...data,
  });
}
