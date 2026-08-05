import { z } from "zod";

export const paperSchema = z.object({
  partId: z.string().min(1, "Part is required"),
  code: z.string().min(1, "Code is required"),
  title: z.string().min(2, "Title is too short"),
  description: z.string().optional().nullable(),
  accessLevel: z.enum(["FREE", "PREMIUM"]).default("FREE"),
  isActive: z.boolean().default(true),
});

export const partSchema = z.object({
  code: z.string().min(1, "Code is required"),
  title: z.string().min(2, "Title is too short"),
  description: z.string().optional().nullable(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const categorySchema = z.object({
  paperId: z.string().min(1, "Paper is required"),
  title: z.string().min(2, "Title is too short"),
  description: z.string().optional().nullable(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const subCategorySchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  title: z.string().min(2, "Title is too short"),
  description: z.string().optional().nullable(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const mockExamSchema = z.object({
  paperId: z.string().min(1, "Paper is required"),
  /** Optional — server auto-generates from paper code when omitted (e.g. "MA Mock Exam"). */
  title: z.string().min(2, "Title is too short").optional(),
  description: z.string().optional().nullable(),
  durationMinutes: z.number().int().min(1).max(600).default(40),
  passMarkPercent: z.number().min(0).max(100).default(50),
  order: z.number().int().min(0).default(0),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  accessLevel: z.enum(["FREE", "PREMIUM"]).default("FREE"),
  isPremium: z.boolean().default(false),
  priceCents: z.number().int().min(0).optional().nullable(),
  currency: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export function mockExamTitleFromPaper(paperCode: string): string {
  return `${paperCode} Mock Exam`;
}

export const mockExamQuestionsSchema = z.object({
  questionIds: z.array(z.string().min(1)).min(0),
});
