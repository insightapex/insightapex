-- CreateEnum
CREATE TYPE "QuestionAccessLevel" AS ENUM ('FREE_TRIAL', 'PREMIUM');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "accessLevel" "QuestionAccessLevel" NOT NULL DEFAULT 'PREMIUM';

-- Mark the earliest question in each sub category as a free trial sample
UPDATE "Question" q
SET "accessLevel" = 'FREE_TRIAL'
FROM (
  SELECT DISTINCT ON ("subCategoryId") id
  FROM "Question"
  ORDER BY "subCategoryId", "createdAt" ASC
) first_q
WHERE q.id = first_q.id;
