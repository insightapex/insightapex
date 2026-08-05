-- PRACTICE vs MOCK_EXAM question purpose; optional subCategory for mock bank questions;
-- import metadata columns used by Excel question bank importer.

CREATE TYPE "QuestionPurpose" AS ENUM ('PRACTICE', 'MOCK_EXAM');
CREATE TYPE "QuestionImportStatus" AS ENUM ('PREVIEW', 'COMPLETED', 'FAILED', 'CANCELLED');

ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "purpose" "QuestionPurpose" NOT NULL DEFAULT 'PRACTICE';
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "externalQuestionId" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "explanationMy" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "learningOutcome" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "reviewStatus" TEXT;
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "lastImportedAt" TIMESTAMP(3);

-- Make subCategory optional for MOCK_EXAM-only bank items
ALTER TABLE "Question" ALTER COLUMN "subCategoryId" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Question_externalQuestionId_key" ON "Question"("externalQuestionId");
CREATE INDEX IF NOT EXISTS "Question_purpose_idx" ON "Question"("purpose");
CREATE INDEX IF NOT EXISTS "Question_purpose_isActive_idx" ON "Question"("purpose", "isActive");
CREATE INDEX IF NOT EXISTS "Question_externalQuestionId_idx" ON "Question"("externalQuestionId");

-- Taxonomy external IDs for Excel Topic ID / Sub-Topic ID
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "externalTopicId" TEXT;
ALTER TABLE "SubCategory" ADD COLUMN IF NOT EXISTS "externalSubTopicId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Category_paperId_externalTopicId_key"
  ON "Category"("paperId", "externalTopicId");
CREATE UNIQUE INDEX IF NOT EXISTS "SubCategory_categoryId_externalSubTopicId_key"
  ON "SubCategory"("categoryId", "externalSubTopicId");

CREATE TABLE IF NOT EXISTS "QuestionImportBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "status" "QuestionImportStatus" NOT NULL DEFAULT 'PREVIEW',
    "sheetsDetected" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "newCount" INTEGER NOT NULL DEFAULT 0,
    "updateCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateInFileCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "accessLevelDefault" "QuestionAccessLevel" NOT NULL DEFAULT 'PREMIUM',
    "createMissingTaxonomy" BOOLEAN NOT NULL DEFAULT false,
    "previewPayload" JSONB,
    "errorReport" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuestionImportBatch_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QuestionImportBatch_uploadedById_idx" ON "QuestionImportBatch"("uploadedById");
CREATE INDEX IF NOT EXISTS "QuestionImportBatch_createdAt_idx" ON "QuestionImportBatch"("createdAt");
CREATE INDEX IF NOT EXISTS "QuestionImportBatch_status_idx" ON "QuestionImportBatch"("status");

DO $$ BEGIN
  ALTER TABLE "QuestionImportBatch" ADD CONSTRAINT "QuestionImportBatch_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
