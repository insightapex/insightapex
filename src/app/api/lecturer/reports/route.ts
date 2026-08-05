import { NextResponse } from "next/server";
import { requireLecturerApi } from "@/lib/lecturer-auth";
import {
  buildLecturerReportCsv,
  type LecturerReportType,
} from "@/services/lecturer/reports";

const TYPES = new Set<LecturerReportType>([
  "student-progress",
  "paper-performance",
  "mock-participation",
  "at-risk-students",
]);

export async function GET(req: Request) {
  const ctx = await requireLecturerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const type = url.searchParams.get("type") as LecturerReportType | null;
  const paperId = url.searchParams.get("paperId");

  if (!type || !TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
  }
  if (!paperId) {
    return NextResponse.json({ error: "paperId is required" }, { status: 400 });
  }

  const report = await buildLecturerReportCsv(ctx, type, paperId);
  if (!report) {
    return NextResponse.json({ error: "Unable to build report" }, { status: 404 });
  }

  return new NextResponse(report.csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report.filename}"`,
    },
  });
}
