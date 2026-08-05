export const QUESTION_TYPES = [
  { value: "SINGLE_CHOICE", label: "Choose one answer" },
  { value: "MULTIPLE_CHOICE", label: "Choose 2 correct answers" },
  { value: "TRUE_FALSE", label: "True or false" },
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number]["value"];

export function questionTypeLabel(type: QuestionType): string {
  return QUESTION_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function questionTypeInstruction(type: QuestionType): string {
  switch (type) {
    case "MULTIPLE_CHOICE":
      return "Select exactly two answers";
    case "TRUE_FALSE":
      return "Mark true or false";
    default:
      return "Mark one answer";
  }
}

export const TRUE_FALSE_OPTIONS = [
  { text: "True", order: 0 },
  { text: "False", order: 1 },
] as const;
