import { z } from "zod";

export const adminQuestionSchema = z.object({
  topicId: z.string().min(1, "Topic is required"),
  text: z.string().min(5, "Question text is too short"),
  explanation: z.string().optional().nullable(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  marks: z.number().int().min(1).default(1),
  imageUrl: z.string().url().optional().nullable(),
  isActive: z.boolean().default(true),
  options: z
    .array(
      z.object({
        text: z.string().min(1, "Option text required"),
        isCorrect: z.boolean(),
        order: z.number().int(),
      })
    )
    .min(2, "At least 2 options required")
    .refine((opts) => opts.filter((o) => o.isCorrect).length === 1, {
      message: "Exactly one option must be correct",
    }),
});
