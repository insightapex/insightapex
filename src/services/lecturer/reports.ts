import type { LecturerContext } from "@/lib/lecturer-auth";
import {
  getLecturerAtRiskStudents,
  getLecturerDashboard,
  getLecturerMockExams,
  getLecturerStudents,
} from "@/services/lecturer/dashboard";

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\n");
}

export type LecturerReportType =
  | "student-progress"
  | "paper-performance"
  | "mock-participation"
  | "at-risk-students";

export async function buildLecturerReportCsv(
  ctx: LecturerContext,
  type: LecturerReportType,
  paperId: string
): Promise<{ filename: string; csv: string } | null> {
  if (!ctx.paperIds.includes(paperId)) return null;

  if (type === "student-progress") {
    const data = await getLecturerStudents(ctx, { paperId });
    const csv = toCsv(
      ["Student", "Email", "Classes", "Attempts", "Average Score", "Last Active"],
      data.students.map((s) => [
        s.name,
        s.email,
        s.classes.map((c) => c.name).join("; "),
        s.attemptCount,
        s.averageScore ?? "",
        s.lastActive ?? "",
      ])
    );
    return { filename: `student-progress-${paperId}.csv`, csv };
  }

  if (type === "paper-performance") {
    const data = await getLecturerDashboard(ctx, paperId);
    if (!data) return null;
    const csv = toCsv(
      [
        "Category",
        "Sub Category",
        "Average Score",
        "Status",
        "Students Below Passing",
        "Attempt Count",
      ],
      data.categoryPerformance.map((r) => [
        r.categoryTitle,
        r.subCategoryTitle,
        r.averageScore,
        r.status,
        r.studentsBelowPassing,
        r.attemptCount,
      ])
    );
    return { filename: `paper-performance-${data.paper.code}.csv`, csv };
  }

  if (type === "mock-participation") {
    const data = await getLecturerMockExams(ctx, paperId);
    const dir = new Map((data.studentDirectory ?? []).map((s) => [s.id, s]));
    const rows: Array<Array<unknown>> = [];
    for (const m of data.mocks) {
      for (const score of m.scores as Array<{
        name: string;
        email: string;
        scorePercent: number | null;
        passed: boolean | null;
      }>) {
        rows.push([
          m.title,
          m.paperCode,
          score.name,
          score.email,
          "Attempted",
          score.scorePercent ?? "",
          score.passed == null ? "" : score.passed ? "Pass" : "Fail",
        ]);
      }
      for (const id of m.notAttemptedStudentIds as string[]) {
        const s = dir.get(id);
        rows.push([
          m.title,
          m.paperCode,
          s?.name ?? id,
          s?.email ?? "",
          "Not attempted",
          "",
          "",
        ]);
      }
    }
    const csv = toCsv(
      ["Mock Exam", "Paper", "Student", "Email", "Status", "Score", "Result"],
      rows
    );
    return { filename: `mock-participation-${paperId}.csv`, csv };
  }

  // at-risk-students
  const data = await getLecturerAtRiskStudents(ctx, paperId);
  if (!data) return null;
  const csv = toCsv(
    ["Student", "Email", "Overall Score", "Mock Attempts", "Last Active", "Risk Status"],
    (data.students as Array<{
      name: string;
      email: string;
      overallScore: number | null;
      mockAttempts: number;
      lastActive: string | null;
      riskStatus: string;
    }>).map((s) => [
      s.name,
      s.email,
      s.overallScore ?? "",
      s.mockAttempts,
      s.lastActive ?? "",
      s.riskStatus,
    ])
  );
  return { filename: `at-risk-students-${paperId}.csv`, csv };
}
