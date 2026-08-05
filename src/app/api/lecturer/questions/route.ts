import { NextResponse } from "next/server";
import { requireLecturerApi } from "@/lib/lecturer-auth";
import { getLecturerQuestions } from "@/services/lecturer/dashboard";

export async function GET(req: Request) {
  const ctx = await requireLecturerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const paperId = new URL(req.url).searchParams.get("paperId");
  const data = await getLecturerQuestions(ctx, paperId);
  return NextResponse.json(data);
}
