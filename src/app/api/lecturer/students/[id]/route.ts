import { NextResponse } from "next/server";
import { requireLecturerApi } from "@/lib/lecturer-auth";
import { getLecturerStudentDetail } from "@/services/lecturer/dashboard";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const ctx = await requireLecturerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await getLecturerStudentDetail(ctx, params.id);
  if (!data) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  return NextResponse.json(data);
}
