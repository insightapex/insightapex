import { z } from "zod";

export const topicSchema = z.object({
  paperId: z.string().min(1, "Paper is required"),
  title: z.string().min(2, "Title is too short"),
  description: z.string().optional().nullable(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const mockExamSchema = z.object({
  paperId: z.string().min(1, "Paper is required"),
  title: z.string().min(2, "Title is too short"),
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

export const mockExamQuestionsSchema = z.object({
  questionIds: z.array(z.string().min(1)).min(0),
});
