import { prisma } from "@/lib/prisma";
import type { QuestionType } from "@/lib/question-types";

export function gradeQuestionAnswer(params: {
  questionType: QuestionType;
  options: { id: string; isCorrect: boolean }[];
  selectedOptionId: string | null;
  selectedOptionIds: string[];
}): boolean {
  const correctIds = params.options
    .filter((option) => option.isCorrect)
    .map((option) => option.id)
    .sort();

  // Multi-correct Excel questions (even if still tagged SINGLE_CHOICE in DB)
  const isMulti =
    params.questionType === "MULTIPLE_CHOICE" || correctIds.length > 1;

  if (isMulti) {
    const selected =
      params.selectedOptionIds.length > 0
        ? [...params.selectedOptionIds]
        : params.selectedOptionId
          ? [params.selectedOptionId]
          : [];
    selected.sort();
    return (
      selected.length === correctIds.length &&
      selected.every((id, index) => id === correctIds[index])
    );
  }

  if (!params.selectedOptionId) return false;
  const selected = params.options.find((option) => option.id === params.selectedOptionId);
  return selected?.isCorrect ?? false;
}

export async function loadQuestionsForGrading(questionIds: string[]) {
  return prisma.question.findMany({
    where: { id: { in: questionIds } },
    select: {
      id: true,
      questionType: true,
      options: { select: { id: true, isCorrect: true } },
    },
  });
}
