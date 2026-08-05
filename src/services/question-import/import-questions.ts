/**
 * Persist validated Excel rows into InsightApex (PRACTICE questions only).
 * Uses externalQuestionId as the stable upsert key.
 */

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  ConfirmImportResult,
  ImportAccessLevel,
  ValidatedImportRow,
} from "./types";

export type RunImportParams = {
  batchId: string;
  uploadedById: string;
  rows: ValidatedImportRow[];
  accessLevelDefault: ImportAccessLevel;
  createMissingTaxonomy: boolean;
};

async function ensureCategory(
  tx: Prisma.TransactionClient,
  row: ValidatedImportRow,
  allowCreate: boolean
): Promise<string> {
  if (row.categoryId) return row.categoryId;

  const existing = await tx.category.findFirst({
    where: {
      paperId: row.paperId,
      OR: [
        { externalTopicId: row.topicId },
        { title: { equals: row.topicName, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (existing) {
    await tx.category.update({
      where: { id: existing.id },
      data: {
        externalTopicId: row.topicId,
        title: row.topicName,
      },
    });
    return existing.id;
  }

  if (!allowCreate) {
    throw new Error(`Category missing for Topic ID ${row.topicId}`);
  }

  const created = await tx.category.create({
    data: {
      paperId: row.paperId,
      title: row.topicName,
      externalTopicId: row.topicId,
      isActive: true,
    },
    select: { id: true },
  });
  return created.id;
}

async function ensureSubCategory(
  tx: Prisma.TransactionClient,
  categoryId: string,
  row: ValidatedImportRow,
  allowCreate: boolean
): Promise<string> {
  if (row.subCategoryId) return row.subCategoryId;

  const existing = await tx.subCategory.findFirst({
    where: {
      categoryId,
      OR: [
        { externalSubTopicId: row.subTopicId },
        { title: { equals: row.subTopicName, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (existing) {
    await tx.subCategory.update({
      where: { id: existing.id },
      data: {
        externalSubTopicId: row.subTopicId,
        title: row.subTopicName,
      },
    });
    return existing.id;
  }

  if (!allowCreate) {
    throw new Error(`Sub Category missing for Sub-Topic ID ${row.subTopicId}`);
  }

  const created = await tx.subCategory.create({
    data: {
      categoryId,
      title: row.subTopicName,
      externalSubTopicId: row.subTopicId,
      isActive: true,
    },
    select: { id: true },
  });
  return created.id;
}

export async function runQuestionImport(
  params: RunImportParams
): Promise<ConfirmImportResult> {
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const createdExternalIds: string[] = [];
  const updatedExternalIds: string[] = [];
  const failures: Array<{ rowNumber: number; externalQuestionId: string; error: string }> =
    [];

  try {
    await prisma.$transaction(
      async (tx) => {
        for (const row of params.rows) {
          try {
            const categoryId = await ensureCategory(
              tx,
              row,
              params.createMissingTaxonomy || row.willCreateCategory
            );
            const subCategoryId = await ensureSubCategory(
              tx,
              categoryId,
              row,
              params.createMissingTaxonomy || row.willCreateSubCategory
            );

            const accessLevel = row.accessLevel || params.accessLevelDefault;
            const optionData = row.options.map((o) => ({
              text: o.text,
              isCorrect: o.isCorrect,
              order: o.order,
            }));

            const existing = await tx.question.findUnique({
              where: { externalQuestionId: row.externalQuestionId },
              select: { id: true },
            });

            if (existing) {
              await tx.answerOption.deleteMany({ where: { questionId: existing.id } });
              await tx.question.update({
                where: { id: existing.id },
                data: {
                  subCategoryId,
                  text: row.questionText,
                  explanation: row.explanationEn,
                  explanationMy: row.explanationMy,
                  learningOutcome: row.learningOutcome,
                  questionType: row.questionType,
                  difficulty: row.difficulty,
                  accessLevel,
                  purpose: "PRACTICE",
                  reviewStatus: row.reviewStatus,
                  isActive: row.isActive,
                  lastImportedAt: new Date(),
                  options: { create: optionData },
                },
              });
              updated += 1;
              updatedExternalIds.push(row.externalQuestionId);
            } else {
              await tx.question.create({
                data: {
                  externalQuestionId: row.externalQuestionId,
                  subCategoryId,
                  text: row.questionText,
                  explanation: row.explanationEn,
                  explanationMy: row.explanationMy,
                  learningOutcome: row.learningOutcome,
                  questionType: row.questionType,
                  difficulty: row.difficulty,
                  accessLevel,
                  purpose: "PRACTICE",
                  reviewStatus: row.reviewStatus,
                  isActive: row.isActive,
                  lastImportedAt: new Date(),
                  options: { create: optionData },
                },
              });
              created += 1;
              createdExternalIds.push(row.externalQuestionId);
            }
          } catch (e) {
            failed += 1;
            failures.push({
              rowNumber: row.rowNumber,
              externalQuestionId: row.externalQuestionId,
              error: e instanceof Error ? e.message : "Import failed",
            });
            // Fail the whole transaction if any row fails — per spec
            throw e;
          }
        }
      },
      { timeout: 120_000 }
    );

    const existingPayload = await prisma.questionImportBatch.findUnique({
      where: { id: params.batchId },
      select: { previewPayload: true },
    });
    const prev =
      existingPayload?.previewPayload && typeof existingPayload.previewPayload === "object"
        ? (existingPayload.previewPayload as Record<string, unknown>)
        : {};

    await prisma.questionImportBatch.update({
      where: { id: params.batchId },
      data: {
        status: "COMPLETED",
        createdCount: created,
        updatedCount: updated,
        skippedCount: skipped,
        failedCount: 0,
        completedAt: new Date(),
        errorReport: failures.length ? failures : undefined,
        previewPayload: {
          ...prev,
          createdExternalIds,
          updatedExternalIds,
        } as object,
      },
    });

    return {
      batchId: params.batchId,
      created,
      updated,
      skipped,
      failed: 0,
      totalProcessed: created + updated,
      status: "COMPLETED",
      createdExternalIds,
      updatedExternalIds,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Import transaction failed";
    await prisma.questionImportBatch.update({
      where: { id: params.batchId },
      data: {
        status: "FAILED",
        createdCount: 0,
        updatedCount: 0,
        failedCount: params.rows.length,
        completedAt: new Date(),
        errorReport: [
          ...failures,
          {
            rowNumber: 0,
            externalQuestionId: "",
            error: "Import rolled back. " + message,
          },
        ],
      },
    });

    return {
      batchId: params.batchId,
      created: 0,
      updated: 0,
      skipped: 0,
      failed: params.rows.length,
      totalProcessed: 0,
      status: "FAILED",
      createdExternalIds: [],
      updatedExternalIds: [],
    };
  }
}
