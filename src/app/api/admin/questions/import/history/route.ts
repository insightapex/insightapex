import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireContentEditorApi } from "@/lib/admin-auth";

export async function GET() {
  const user = await requireContentEditorApi();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const batches = await prisma.questionImportBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      fileName: true,
      status: true,
      totalRows: true,
      validRows: true,
      invalidRows: true,
      createdCount: true,
      updatedCount: true,
      failedCount: true,
      skippedCount: true,
      accessLevelDefault: true,
      createMissingTaxonomy: true,
      createdAt: true,
      completedAt: true,
      uploadedBy: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({
    imports: batches.map((b) => ({
      ...b,
      createdAt: b.createdAt.toISOString(),
      completedAt: b.completedAt?.toISOString() ?? null,
    })),
  });
}
