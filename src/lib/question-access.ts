export const QUESTION_ACCESS_LEVELS = [
  { value: "FREE_TRIAL", label: "Free Trial" },
  { value: "PREMIUM", label: "Premium" },
] as const;

export type QuestionAccessLevel = (typeof QUESTION_ACCESS_LEVELS)[number]["value"];

export function questionAccessLabel(level: QuestionAccessLevel | string): string {
  return QUESTION_ACCESS_LEVELS.find((l) => l.value === level)?.label ?? level;
}

export function questionAccessBadgeTone(
  level: QuestionAccessLevel | string
): "success" | "brand" {
  return level === "FREE_TRIAL" ? "success" : "brand";
}

export interface QuestionCountBreakdown {
  freeQuestionCount: number;
  premiumQuestionCount: number;
  totalQuestionCount: number;
  accessibleQuestionCount: number;
}

export function buildAccessibleCount(
  counts: Pick<QuestionCountBreakdown, "freeQuestionCount" | "totalQuestionCount">,
  hasPremiumAccess: boolean
): number {
  return hasPremiumAccess ? counts.totalQuestionCount : counts.freeQuestionCount;
}
