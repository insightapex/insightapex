import { prisma } from "@/lib/prisma";

export type PlatformSettingsPublic = {
  maintenanceMode: boolean;
  maintenanceAdminAccess: boolean;
  currency: string;
  passMarkPercent: number;
  allowPreviousQuestion: boolean;
  allowQuestionFlagging: boolean;
  allowDifficultyRating: boolean;
  allowAnswerReview: boolean;
  showExplanationAfterCheck: boolean;
  allowBookmarks: boolean;
  defaultPassMark: number;
  defaultTimerMinutes: number;
  randomiseQuestions: boolean;
  randomiseAnswerOptions: boolean;
  enableNegativeMarking: boolean;
};

const DEFAULTS: PlatformSettingsPublic = {
  maintenanceMode: false,
  maintenanceAdminAccess: true,
  currency: "GBP",
  passMarkPercent: 50,
  allowPreviousQuestion: true,
  allowQuestionFlagging: true,
  allowDifficultyRating: true,
  allowAnswerReview: true,
  showExplanationAfterCheck: true,
  allowBookmarks: true,
  defaultPassMark: 50,
  defaultTimerMinutes: 40,
  randomiseQuestions: true,
  randomiseAnswerOptions: true,
  enableNegativeMarking: false,
};

export async function getPlatformSettings(): Promise<PlatformSettingsPublic> {
  try {
    const row = await prisma.platformSettings.findUnique({
      where: { id: "default" },
      select: {
        maintenanceMode: true,
        maintenanceAdminAccess: true,
        currency: true,
        defaultPassMark: true,
        defaultTimerMinutes: true,
        allowPreviousQuestion: true,
        allowQuestionFlagging: true,
        allowDifficultyRating: true,
        allowAnswerReview: true,
        showExplanationAfterCheck: true,
        allowBookmarks: true,
        randomiseQuestions: true,
        randomiseAnswerOptions: true,
        enableNegativeMarking: true,
      },
    });
    if (!row) return DEFAULTS;
    return {
      maintenanceMode: Boolean(row.maintenanceMode),
      maintenanceAdminAccess: Boolean(row.maintenanceAdminAccess),
      currency: row.currency ?? DEFAULTS.currency,
      passMarkPercent: row.defaultPassMark ?? DEFAULTS.passMarkPercent,
      allowPreviousQuestion: Boolean(row.allowPreviousQuestion),
      allowQuestionFlagging: Boolean(row.allowQuestionFlagging),
      allowDifficultyRating: Boolean(row.allowDifficultyRating),
      allowAnswerReview: Boolean(row.allowAnswerReview),
      showExplanationAfterCheck: Boolean(row.showExplanationAfterCheck),
      allowBookmarks: Boolean(row.allowBookmarks),
      defaultPassMark: row.defaultPassMark ?? DEFAULTS.defaultPassMark,
      defaultTimerMinutes: row.defaultTimerMinutes ?? DEFAULTS.defaultTimerMinutes,
      randomiseQuestions: Boolean(row.randomiseQuestions),
      randomiseAnswerOptions: Boolean(row.randomiseAnswerOptions),
      enableNegativeMarking: Boolean(row.enableNegativeMarking),
    };
  } catch {
    return DEFAULTS;
  }
}

export async function getPassMarkPercent(): Promise<number> {
  const s = await getPlatformSettings();
  return s.passMarkPercent;
}
