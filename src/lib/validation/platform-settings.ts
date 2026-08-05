import { z } from "zod";

export const SETTINGS_SECTIONS = [
  "general",
  "student",
  "quiz",
  "billing",
  "email",
  "security",
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const generalSettingsSchema = z.object({
  platformName: z.string().trim().min(2).max(80),
  supportEmail: z.string().trim().email(),
  platformUrl: z.string().trim().url(),
  timezone: z.string().trim().min(1).max(64),
  currency: z.string().trim().length(3).toUpperCase(),
  maintenanceMode: z.boolean(),
});

export const studentSettingsSchema = z.object({
  allowRegistration: z.boolean(),
  requireEmailVerification: z.boolean(),
  allowBookmarks: z.boolean(),
  allowQuestionFlagging: z.boolean(),
  allowDifficultyRating: z.boolean(),
  allowAnswerReview: z.boolean(),
  studentSessionTimeoutMinutes: z.number().int().min(5).max(1440),
});

export const quizSettingsSchema = z.object({
  defaultPassMark: z.number().int().min(0).max(100),
  defaultTimerMinutes: z.number().int().min(0).max(240),
  randomiseQuestions: z.boolean(),
  randomiseAnswerOptions: z.boolean(),
  allowPreviousQuestion: z.boolean(),
  showExplanationAfterCheck: z.boolean(),
  enableNegativeMarking: z.boolean(),
});

export const billingSettingsSchema = z.object({
  enableMonthlyPlan: z.boolean(),
  enableYearlyPlan: z.boolean(),
  enablePaperPurchases: z.boolean(),
  enableMockExamPurchases: z.boolean(),
});

export const emailSettingsSchema = z.object({
  senderName: z.string().trim().min(2).max(80),
  senderEmail: z.string().trim().email(),
  enableVerificationEmails: z.boolean(),
  enableResetPasswordEmails: z.boolean(),
});

export const securitySettingsSchema = z.object({
  minPasswordLength: z.number().int().min(6).max(128),
  maxLoginAttempts: z.number().int().min(3).max(50),
  adminSessionTimeoutMinutes: z.number().int().min(15).max(1440),
  requireAdmin2fa: z.boolean(),
  maintenanceAdminAccess: z.boolean(),
});

export const settingsPatchSchema = z.discriminatedUnion("section", [
  z.object({ section: z.literal("general"), data: generalSettingsSchema }),
  z.object({ section: z.literal("student"), data: studentSettingsSchema }),
  z.object({ section: z.literal("quiz"), data: quizSettingsSchema }),
  z.object({ section: z.literal("billing"), data: billingSettingsSchema }),
  z.object({ section: z.literal("email"), data: emailSettingsSchema }),
  z.object({ section: z.literal("security"), data: securitySettingsSchema }),
]);

export type GeneralSettings = z.infer<typeof generalSettingsSchema>;
export type StudentSettings = z.infer<typeof studentSettingsSchema>;
export type QuizSettings = z.infer<typeof quizSettingsSchema>;
export type BillingSettings = z.infer<typeof billingSettingsSchema>;
export type EmailSettings = z.infer<typeof emailSettingsSchema>;
export type SecuritySettings = z.infer<typeof securitySettingsSchema>;

export function buildRegisterPasswordSchema(minLength: number) {
  return z
    .string()
    .min(minLength, `Password must be at least ${minLength} characters`)
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number");
}
