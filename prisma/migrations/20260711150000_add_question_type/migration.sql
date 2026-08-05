-- Question type + multi-select support on responses

CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'TRUE_FALSE');

ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "questionType" "QuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE';

ALTER TABLE "QuestionResponse" ADD COLUMN IF NOT EXISTS "selectedOptionIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
