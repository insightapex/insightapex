import { z } from "zod";

const optionSchema = z.object({
  text: z.string().min(1, "Option text required"),
  isCorrect: z.boolean(),
  order: z.number().int(),
});

function refineQuestionOptions(
  data: {
    questionType: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
    options: { text: string; isCorrect: boolean; order: number }[];
  },
  ctx: z.RefinementCtx
) {
  const correctCount = data.options.filter((o) => o.isCorrect).length;

  if (data.questionType === "TRUE_FALSE") {
    if (data.options.length !== 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "True/false questions must have exactly 2 options",
        path: ["options"],
      });
    }
    if (correctCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mark either True or False as the correct answer",
        path: ["options"],
      });
    }
    return;
  }

  if (data.options.length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least 2 options required",
      path: ["options"],
    });
  }

  if (data.questionType === "SINGLE_CHOICE" && correctCount !== 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Exactly one option must be correct",
      path: ["options"],
    });
  }

  if (data.questionType === "MULTIPLE_CHOICE" && correctCount < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least two options must be marked as correct",
      path: ["options"],
    });
  }
}

/** Practice Questions admin form — Part → Paper → Category → Sub Category */
export const adminPracticeQuestionSchema = z
  .object({
    purpose: z.literal("PRACTICE").default("PRACTICE"),
    subCategoryId: z.string().min(1, "Sub Category is required"),
    text: z.string().min(5, "Question text is too short"),
    explanation: z.string().optional().nullable(),
    questionType: z
      .enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"])
      .default("SINGLE_CHOICE"),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
    marks: z.number().int().min(1).default(1),
    imageUrl: z.string().url().optional().nullable(),
    accessLevel: z.enum(["FREE_TRIAL", "PREMIUM"]).default("PREMIUM"),
    isActive: z.boolean().default(true),
    options: z.array(optionSchema),
  })
  .superRefine(refineQuestionOptions);

/** @deprecated Use adminPracticeQuestionSchema */
export const adminQuestionSchema = adminPracticeQuestionSchema;

/** Mock exam question create — belongs only to a specific mock exam */
export const adminMockExamQuestionSchema = z
  .object({
    purpose: z.literal("MOCK_EXAM").default("MOCK_EXAM"),
    text: z.string().min(5, "Question text is too short"),
    explanation: z.string().optional().nullable(),
    questionType: z
      .enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE"])
      .default("SINGLE_CHOICE"),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
    marks: z.number().int().min(1).default(1),
    imageUrl: z.string().url().optional().nullable(),
    accessLevel: z.enum(["FREE_TRIAL", "PREMIUM"]).default("PREMIUM"),
    isActive: z.boolean().default(true),
    options: z.array(optionSchema),
  })
  .superRefine(refineQuestionOptions);
