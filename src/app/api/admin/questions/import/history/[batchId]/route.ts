import { NextRequest, NextResponse } from "next/server";
import { requireContentEditorApi } from "@/lib/admin-auth";
import { ADMIN_AUDIT_ACTIONS } from "@/lib/admin-audit";
import { logAdminAudit } from "@/services/admin/audit-log";
import {
  deleteImportBatchQuestions,
  type DeleteImportMode,
} from "@/services/question-import";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = { params: { batchId: string } };

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const user = await requireContentEditorApi();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const modeParam = url.searchParams.get("mode");
  const mode: DeleteImportMode = modeParam === "all" ? "all" : "created";

  const batch = await prisma.questionImportBatch.findUnique({
    where: { id: params.batchId },
    select: { id: true, fileName: true, status: true, uploadedById: true },
  });

  if (!batch) {
    return NextResponse.json({ error: "Import batch not found" }, { status: 404 });
  }

  if (batch.uploadedById !== user.id && user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await deleteImportBatchQuestions({
      batchId: params.batchId,
      mode,
    });

    await logAdminAudit({
      userId: user.id,
      action: ADMIN_AUDIT_ACTIONS.QUESTION_IMPORT_DELETED,
      target: batch.fileName,
      targetType: "question_import_batch",
      targetId: batch.id,
      metadata: {
        mode: result.mode,
        deletedCount: result.deletedCount,
        deletedExternalIds: result.deletedExternalIds,
      },
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });

    return NextResponse.json({ result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete import";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
