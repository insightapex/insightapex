export const MAX_PRACTICE_QUESTIONS = 40;

const STANDARD_QUESTION_COUNTS = [10, 20, 30, 40];

/** Returns selectable question counts capped at 40 and the available pool size. */
export function getQuestionCountOptions(availableCount: number): number[] {
  if (availableCount <= 0) return [];

  const cap = Math.min(availableCount, MAX_PRACTICE_QUESTIONS);
  const options = STANDARD_QUESTION_COUNTS.filter((count) => count <= cap);

  if (!options.includes(cap)) {
    options.push(cap);
  }

  return options.sort((a, b) => a - b);
}

export type TimeOption = "untimed" | "20" | "40";
export type ReviewMode = "after_each" | "at_end";

export function timeOptionToSeconds(option: TimeOption): number {
  if (option === "20") return 20 * 60;
  if (option === "40") return 40 * 60;
  return 0;
}
