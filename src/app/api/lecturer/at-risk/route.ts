import { NextResponse } from "next/server";
import { requireLecturerApi } from "@/lib/lecturer-auth";
import { getLecturerAtRiskStudents } from "@/services/lecturer/dashboard";

export async function GET(req: Request) {
  const ctx = await requireLecturerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const paperId = new URL(req.url).searchParams.get("paperId");
  if (!paperId) {
    return NextResponse.json({ error: "paperId is required" }, { status: 400 });
  }

  const data = await getLecturerAtRiskStudents(ctx, paperId);
  if (!data) return NextResponse.json({ error: "Paper not found or not assigned" }, { status: 404 });

  return NextResponse.json(data);
}
