/**
 * Validate & map raw Excel rows → InsightApex question payloads.
 */

import { prisma } from "@/lib/prisma";
import type {
  ImportAccessLevel,
  ImportPreviewRow,
  ImportPreviewSummary,
  MappedDifficulty,
  MappedQuestionType,
  RawImportRow,
  ValidatedImportOption,
  ValidatedImportRow,
} from "./types";

function norm(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Keep Excel ALT+ENTER line breaks; only collapse spaces within each line. */
function normMultiline(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mapQuestionType(raw: string): MappedQuestionType | null {
  const t = norm(raw).toLowerCase();
  if (!t) return null;
  if (
    t === "mcq" ||
    t === "multiple choice" ||
    t === "single choice" ||
    t === "single_choice" ||
    (t.includes("multiple choice") && !t.includes("response"))
  ) {
    return "SINGLE_CHOICE";
  }
  if (
    t === "true/false" ||
    t === "true false" ||
    t === "true_false" ||
    t === "t/f" ||
    t === "tf"
  ) {
    return "TRUE_FALSE";
  }
  if (
    t === "multiple response" ||
    t === "mrq" ||
    t === "multi response" ||
    t.includes("multiple response") ||
    t === "multiple_choice"
  ) {
    return "MULTIPLE_CHOICE";
  }
  // Sentence completion / fill-in-the-blank — stored as single choice
  // (A–D options when present, otherwise Correct Answer becomes the only option)
  if (
    t === "sentence completion" ||
    t === "sentence_completion" ||
    t === "completion" ||
    t === "blank" ||
    t.includes("sentence completion") ||
    t.includes("fill") ||
    t.includes("blank")
  ) {
    return "SINGLE_CHOICE";
  }
  return null;
}

function mapDifficulty(raw: string): MappedDifficulty | null {
  const t = norm(raw).toUpperCase();
  if (!t) return "MEDIUM";
  if (t === "EASY" || t === "E" || t === "1") return "EASY";
  if (t === "MEDIUM" || t === "MED" || t === "M" || t === "2" || t === "MODERATE") return "MEDIUM";
  if (t === "HARD" || t === "H" || t === "3" || t === "DIFFICULT") return "HARD";
  return null;
}

function mapReviewStatus(raw: string): { reviewStatus: string; isActive: boolean } | null {
  const t = norm(raw).toLowerCase();
  if (!t) return { reviewStatus: "Approved", isActive: true };
  if (t === "draft" || t === "unpublished" || t === "pending") {
    return { reviewStatus: "Draft", isActive: false };
  }
  if (
    t === "approved" ||
    t === "published" ||
    t === "reviewed" ||
    t === "active" ||
    t === "live"
  ) {
    return { reviewStatus: norm(raw), isActive: true };
  }
  return null;
}

function mapAccessLevel(raw: string, fallback: ImportAccessLevel): ImportAccessLevel | null {
  const t = norm(raw).toUpperCase().replace(/\s+/g, "_");
  if (!t) return fallback;
  if (t === "FREE_TRIAL" || t === "FREE" || t === "TRIAL") return "FREE_TRIAL";
  if (t === "PREMIUM" || t === "PAID") return "PREMIUM";
  return null;
}

/** Parse "B" | "A, C" | "A,C" | "A and C" | "A C" | "A/C" → ["A","C"] */
export function parseCorrectLetters(raw: string): string[] {
  const cleaned = norm(raw).toUpperCase();
  if (!cleaned) return [];

  // Prefer explicit letter tokens
  const tokenMatches = cleaned.match(/\b[A-D]\b/g);
  if (tokenMatches && tokenMatches.length > 0) {
    return [...new Set(tokenMatches)];
  }

  // Compact forms: "AC", "A/C", "A&C"
  const compact = cleaned
    .replace(/\band\b/gi, "")
    .replace(/[^A-D]/g, "");
  if (!compact) return [];
  return [...new Set(compact.split(""))];
}

function buildOptions(
  row: RawImportRow,
  type: MappedQuestionType,
  correctLetters: string[]
): { options: ValidatedImportOption[]; error?: string } {
  const defs: Array<{ label: "A" | "B" | "C" | "D"; text: string; order: number }> = [
    { label: "A", text: norm(row.optionA), order: 0 },
    { label: "B", text: norm(row.optionB), order: 1 },
    { label: "C", text: norm(row.optionC), order: 2 },
    { label: "D", text: norm(row.optionD), order: 3 },
  ];

  let present = defs.filter((d) => d.text);

  // Blank / free-text answer with no options — create one correct option from Correct Answer
  if (present.length === 0 && norm(row.correctAnswerRaw)) {
    const answerText = norm(row.correctAnswerRaw);
    if (!/^[A-D]([,\s;/|&]|and|$)/i.test(answerText) || answerText.length > 3) {
      present = [{ label: "A", text: answerText, order: 0 }];
      return {
        options: [{ label: "A", text: answerText, isCorrect: true, order: 0 }],
      };
    }
  }

  if (type === "TRUE_FALSE") {
    if (present.length === 0) {
      present = [
        { label: "A", text: "True", order: 0 },
        { label: "B", text: "False", order: 1 },
      ];
    }
    if (present.length !== 2) {
      return { options: [], error: "True/False questions require exactly 2 options" };
    }
  } else if (present.length < 2) {
    return { options: [], error: "At least 2 answer options are required" };
  }

  const presentLabels = new Set(present.map((p) => p.label));
  for (const letter of correctLetters) {
    if (!presentLabels.has(letter as "A" | "B" | "C" | "D")) {
      return {
        options: [],
        error: `Correct answer ${letter} refers to a missing option`,
      };
    }
  }

  if (correctLetters.length === 0) {
    return { options: [], error: "Correct answer is required" };
  }

  // Multiple correct letters always stored as multi-select (Excel may still say MCQ)
  if (type === "TRUE_FALSE" && correctLetters.length !== 1) {
    return {
      options: [],
      error: "True/False must have exactly one correct answer (A or B)",
    };
  }

  if (type === "MULTIPLE_CHOICE" && correctLetters.length < 2) {
    return {
      options: [],
      error: "Multiple Response requires at least two correct answers",
    };
  }

  // SINGLE_CHOICE with 2+ correct answers is promoted by caller to MULTIPLE_CHOICE

  const correctSet = new Set(correctLetters);
  return {
    options: present.map((p) => ({
      label: p.label,
      text: p.text,
      isCorrect: correctSet.has(p.label),
      order: p.order,
    })),
  };
}

export type ValidateImportParams = {
  fileName: string;
  sheetsDetected: string[];
  rows: RawImportRow[];
  defaultAccessLevel: ImportAccessLevel;
  createMissingTaxonomy: boolean;
};

export type ValidateImportResult = {
  summary: ImportPreviewSummary;
  validRows: ValidatedImportRow[];
};

export async function validateImportRows(
  params: ValidateImportParams
): Promise<ValidateImportResult> {
  const papers = await prisma.paper.findMany({
    where: { isActive: true },
    select: {
      id: true,
      code: true,
      categories: {
        select: {
          id: true,
          title: true,
          externalTopicId: true,
          subCategories: {
            select: {
              id: true,
              title: true,
              externalSubTopicId: true,
            },
          },
        },
      },
    },
  });

  const paperByCode = new Map(
    papers.map((p) => [p.code.trim().toUpperCase(), p] as const)
  );

  const existingExternal = await prisma.question.findMany({
    where: {
      externalQuestionId: {
        in: params.rows.map((r) => norm(r.externalQuestionId)).filter(Boolean),
      },
    },
    select: { id: true, externalQuestionId: true },
  });
  const existingByExternal = new Map(
    existingExternal
      .filter((q) => q.externalQuestionId)
      .map((q) => [q.externalQuestionId as string, q.id])
  );

  // Count Question IDs in the workbook so *every* repeated row is blocked (not just the 2nd+)
  const idCountsInFile = new Map<string, number>();
  const firstRowById = new Map<string, number>();
  for (const row of params.rows) {
    const id = norm(row.externalQuestionId);
    if (!id) continue;
    idCountsInFile.set(id, (idCountsInFile.get(id) ?? 0) + 1);
    if (!firstRowById.has(id)) firstRowById.set(id, row.rowNumber);
  }

  const previewRows: ImportPreviewRow[] = [];
  const validRows: ValidatedImportRow[] = [];

  for (const row of params.rows) {
    const errors: string[] = [];
    const externalQuestionId = norm(row.externalQuestionId);
    const paperCode = norm(row.subject).toUpperCase();
    const topicId = norm(row.topicId);
    const subTopicId = norm(row.subTopicId);
    let topicName = norm(row.topicName);
    let subTopicName = norm(row.subTopicName);

    if (!externalQuestionId) errors.push("Question ID is required");
    if (!norm(row.questionText)) errors.push("Question text is required");
    if (!paperCode) errors.push("Subject (Paper code) is required");

    const existingQuestionId = externalQuestionId
      ? existingByExternal.get(externalQuestionId) ?? null
      : null;

    const fileDupCount = externalQuestionId
      ? idCountsInFile.get(externalQuestionId) ?? 0
      : 0;
    const isFileDup = fileDupCount > 1;
    if (isFileDup && externalQuestionId) {
      const first = firstRowById.get(externalQuestionId) ?? row.rowNumber;
      errors.push(
        `Duplicate question ID in file (ID appears ${fileDupCount} times; first on row ${first}). This file is duplicated.`
      );
    }

    if (existingQuestionId && externalQuestionId) {
      errors.push(
        `Duplicate: question ID "${externalQuestionId}" already exists in the system and will not be imported.`
      );
    }

    const paper = paperByCode.get(paperCode);
    if (paperCode && !paper) {
      errors.push(`Paper code "${paperCode}" not found or inactive`);
    }

    if (!topicId) errors.push("Topic ID is required");
    if (!subTopicId) errors.push("Sub-Topic ID is required");
    if (!topicName) {
      errors.push(
        "Topic Name could not be resolved (formula without cached value / mapping)"
      );
    }
    if (!subTopicName) {
      errors.push(
        "Sub-Topic Name could not be resolved (formula without cached value / mapping)"
      );
    }

    const mappedType = mapQuestionType(row.typeRaw);
    if (!mappedType) errors.push(`Unsupported question type "${row.typeRaw}"`);

    const difficulty = mapDifficulty(row.difficultyRaw);
    if (!difficulty) errors.push(`Invalid difficulty "${row.difficultyRaw}"`);

    const review = mapReviewStatus(row.reviewStatusRaw);
    if (!review) errors.push(`Invalid review status "${row.reviewStatusRaw}"`);

    const accessLevel = mapAccessLevel(row.accessLevelRaw, params.defaultAccessLevel);
    if (!accessLevel) errors.push(`Invalid access level "${row.accessLevelRaw}"`);

    let questionType = mappedType;
    let options: ValidatedImportOption[] = [];
    if (mappedType && difficulty && review && accessLevel) {
      const letters = parseCorrectLetters(row.correctAnswerRaw);
      // Excel may list MCQ but mark two correct letters (e.g. B, D)
      if (mappedType === "SINGLE_CHOICE" && letters.length >= 2) {
        questionType = "MULTIPLE_CHOICE";
      }
      const built = buildOptions(row, questionType!, letters);
      if (built.error) errors.push(built.error);
      else options = built.options;
    }

    let categoryId: string | null = null;
    let subCategoryId: string | null = null;
    let willCreateCategory = false;
    let willCreateSubCategory = false;

    if (paper && topicId && topicName) {
      const cat =
        paper.categories.find((c) => c.externalTopicId === topicId) ??
        paper.categories.find(
          (c) => c.title.trim().toLowerCase() === topicName.toLowerCase()
        );
      if (cat) {
        categoryId = cat.id;
        const sub =
          cat.subCategories.find((s) => s.externalSubTopicId === subTopicId) ??
          cat.subCategories.find(
            (s) => s.title.trim().toLowerCase() === subTopicName.toLowerCase()
          );
        if (sub) {
          subCategoryId = sub.id;
        } else if (params.createMissingTaxonomy) {
          willCreateSubCategory = true;
        } else if (subTopicId && subTopicName) {
          errors.push(
            `Sub Category not found for Sub-Topic ID "${subTopicId}". Enable create-missing taxonomy on confirm, or create it first.`
          );
        }
      } else if (params.createMissingTaxonomy) {
        willCreateCategory = true;
        willCreateSubCategory = true;
      } else {
        errors.push(
          `Category not found for Topic ID "${topicId}". Enable create-missing taxonomy on confirm, or create it first.`
        );
      }
    }

    // Priority: in-file dup → already-in-DB → other validation errors → valid
    const status: ImportPreviewRow["status"] = isFileDup
      ? "duplicate_in_file"
      : existingQuestionId
        ? "duplicate_existing"
        : errors.length
          ? "invalid"
          : "valid";

    const action: ImportPreviewRow["action"] = status === "valid" ? "CREATE" : "SKIP";

    previewRows.push({
      rowNumber: row.rowNumber,
      sheetName: row.sheetName,
      externalQuestionId: externalQuestionId || "—",
      paperCode: paperCode || "—",
      categoryTitle: topicName || "—",
      subCategoryTitle: subTopicName || "—",
      questionType: questionType ?? (norm(row.typeRaw) || "—"),
      reviewStatus: review?.reviewStatus ?? (norm(row.reviewStatusRaw) || "—"),
      status,
      action,
      errorMessage: errors.length ? errors.join("; ") : null,
    });

    // Only brand-new, non-duplicate IDs may be imported
    if (status === "valid" && questionType && difficulty && review && accessLevel) {
      validRows.push({
        sheetName: row.sheetName,
        rowNumber: row.rowNumber,
        externalQuestionId,
        paperCode,
        paperId: paper!.id,
        topicId,
        topicName,
        subTopicId,
        subTopicName,
        categoryId,
        subCategoryId,
        willCreateCategory,
        willCreateSubCategory,
        questionType,
        difficulty,
        learningOutcome: norm(row.learningOutcome) || null,
        questionText: normMultiline(row.questionText) || norm(row.questionText),
        options,
        explanationEn: normMultiline(row.explanationEn) || null,
        explanationMy: normMultiline(row.explanationMy) || null,
        reviewStatus: review.reviewStatus,
        isActive: review.isActive,
        accessLevel,
        existingQuestionId: null,
        action: "CREATE",
      });
    }
  }

  const duplicateRows = previewRows.filter((r) => r.status === "duplicate_in_file").length;
  const duplicateExistingRows = previewRows.filter(
    (r) => r.status === "duplicate_existing"
  ).length;

  const summary: ImportPreviewSummary = {
    fileName: params.fileName,
    sheetsDetected: params.sheetsDetected,
    totalRows: params.rows.length,
    validRows: previewRows.filter((r) => r.status === "valid").length,
    invalidRows: previewRows.filter((r) => r.status === "invalid").length,
    newQuestions: validRows.length,
    existingToUpdate: 0,
    duplicateRows,
    duplicateExistingRows,
    hasDuplicates: duplicateRows > 0 || duplicateExistingRows > 0,
    rows: previewRows,
  };

  return { summary, validRows };
}
