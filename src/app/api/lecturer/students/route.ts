import { NextResponse } from "next/server";
import { requireLecturerApi } from "@/lib/lecturer-auth";
import { getLecturerStudents } from "@/services/lecturer/dashboard";

export async function GET(req: Request) {
  const ctx = await requireLecturerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const data = await getLecturerStudents(ctx, {
    search: url.searchParams.get("search") ?? undefined,
    paperId: url.searchParams.get("paperId"),
  });
  return NextResponse.json(data);
}
