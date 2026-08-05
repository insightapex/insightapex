import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireContentEditorApi } from "@/lib/admin-auth";
import type { ImportPreviewRow } from "@/services/question-import";

export async function GET(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  const user = await requireContentEditorApi();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const batch = await prisma.questionImportBatch.findUnique({
    where: { id: params.batchId },
    select: {
      id: true,
      fileName: true,
      errorReport: true,
      status: true,
    },
  });

  if (!batch) {
    return NextResponse.json({ error: "Import batch not found" }, { status: 404 });
  }

  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const rows = (Array.isArray(batch.errorReport) ? batch.errorReport : []) as Array<
    ImportPreviewRow | { rowNumber: number; externalQuestionId: string; error: string }
  >;

  if (format === "csv") {
    const headers = [
      "Row",
      "Question ID",
      "Paper",
      "Category",
      "Sub Category",
      "Type",
      "Review Status",
      "Validation status",
      "Error message",
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
      if ("status" in r) {
        lines.push(
          [
            r.rowNumber,
            r.externalQuestionId,
            r.paperCode,
            r.categoryTitle,
            r.subCategoryTitle,
            r.questionType,
            r.reviewStatus,
            r.status,
            r.errorMessage ?? "",
          ]
            .map((c) => `"${String(c).replace(/"/g, '""')}"`)
            .join(",")
        );
      } else {
        lines.push(
          [r.rowNumber, r.externalQuestionId, "", "", "", "", "", "failed", r.error]
            .map((c) => `"${String(c).replace(/"/g, '""')}"`)
            .join(",")
        );
      }
    }

    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="import-errors-${batch.id}.csv"`,
      },
    });
  }

  return NextResponse.json({
    batchId: batch.id,
    fileName: batch.fileName,
    status: batch.status,
    rows,
  });
}
