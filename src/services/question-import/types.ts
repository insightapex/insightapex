/**
 * Excel question import — shared types & Zod schemas.
 * Separated from parse / validate / import services.
 */

import { z } from "zod";

export const IMPORT_LIMITS = {
  maxFileBytes: 8 * 1024 * 1024, // 8 MB
  maxRows: 5_000,
  acceptedExt: ".xlsx",
  acceptedMimes: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
    "application/zip",
  ],
} as const;

/** Canonical Excel headers (FA Question Bank workbook). */
export const EXCEL_HEADERS = [
  "No",
  "ID",
  "Subject",
  "Chapter",
  "Topic ID",
  "Sub-Topic ID",
  "Topic Name",
  "Sub-Topic Name",
  "Type",
  "Difficulty",
  "Learning Outcome",
  "Question",
  "Option A",
  "Option B",
  "Option C",
  "Option D",
  "Correct Answer",
  "English Explanation",
  "Burmese Explanation",
  "Last Updated",
  "Review Status",
  "Access Level", // optional future column
] as const;

export type ExcelHeader = (typeof EXCEL_HEADERS)[number];

export const accessLevelSchema = z.enum(["FREE_TRIAL", "PREMIUM"]);

export type ImportAccessLevel = z.infer<typeof accessLevelSchema>;

export const questionTypeSchema = z.enum([
  "SINGLE_CHOICE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
]);

export type MappedQuestionType = z.infer<typeof questionTypeSchema>;

export const difficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);

export type MappedDifficulty = z.infer<typeof difficultySchema>;

export type RawImportRow = {
  sheetName: string;
  rowNumber: number;
  no: string;
  externalQuestionId: string;
  subject: string;
  chapter: string;
  topicId: string;
  subTopicId: string;
  topicName: string;
  subTopicName: string;
  typeRaw: string;
  difficultyRaw: string;
  learningOutcome: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswerRaw: string;
  explanationEn: string;
  explanationMy: string;
  lastUpdated: string;
  reviewStatusRaw: string;
  accessLevelRaw: string;
};

export type ValidatedImportOption = {
  label: "A" | "B" | "C" | "D";
  text: string;
  isCorrect: boolean;
  order: number;
};

export type ValidatedImportRow = {
  sheetName: string;
  rowNumber: number;
  externalQuestionId: string;
  paperCode: string;
  paperId: string;
  topicId: string;
  topicName: string;
  subTopicId: string;
  subTopicName: string;
  categoryId: string | null;
  subCategoryId: string | null;
  willCreateCategory: boolean;
  willCreateSubCategory: boolean;
  questionType: MappedQuestionType;
  difficulty: MappedDifficulty;
  learningOutcome: string | null;
  questionText: string;
  options: ValidatedImportOption[];
  explanationEn: string | null;
  explanationMy: string | null;
  reviewStatus: string;
  isActive: boolean;
  accessLevel: ImportAccessLevel;
  existingQuestionId: string | null;
  action: "CREATE" | "UPDATE";
};

export type PreviewRowStatus = "valid" | "invalid" | "duplicate_in_file";

export type ImportPreviewRow = {
  rowNumber: number;
  sheetName: string;
  externalQuestionId: string;
  paperCode: string;
  categoryTitle: string;
  subCategoryTitle: string;
  questionType: string;
  reviewStatus: string;
  status: PreviewRowStatus;
  action: "CREATE" | "UPDATE" | "SKIP" | null;
  errorMessage: string | null;
};

export type ImportPreviewSummary = {
  fileName: string;
  sheetsDetected: string[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  newQuestions: number;
  existingToUpdate: number;
  duplicateRows: number;
  rows: ImportPreviewRow[];
};

export type ConfirmImportResult = {
  batchId: string;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  totalProcessed: number;
  status: "COMPLETED" | "FAILED";
  createdExternalIds: string[];
  updatedExternalIds: string[];
};
