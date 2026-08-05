-- Create Category table
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- Create SubCategory table
CREATE TABLE "SubCategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubCategory_pkey" PRIMARY KEY ("id")
);

-- Migrate Topic rows to Category (preserve IDs) when Topic table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Topic'
  ) THEN
    INSERT INTO "Category" ("id", "paperId", "title", "description", "isActive", "order", "createdAt", "updatedAt")
    SELECT "id", "paperId", "title", "description", "isActive", "order", "createdAt", "updatedAt"
    FROM "Topic"
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Create default SubCategory per Category (empty DB may have no topics yet)
INSERT INTO "SubCategory" ("id", "categoryId", "title", "description", "isActive", "order", "createdAt", "updatedAt")
SELECT
    c."id" || '-default',
    c."id",
    'General',
    'Migrated from topic',
    true,
    0,
    c."createdAt",
    c."updatedAt"
FROM "Category" c
WHERE NOT EXISTS (
  SELECT 1 FROM "SubCategory" sc WHERE sc."id" = c."id" || '-default'
);

-- Add subCategoryId to Question and migrate from topicId when present
ALTER TABLE "Question" ADD COLUMN IF NOT EXISTS "subCategoryId" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Question' AND column_name = 'topicId'
  ) THEN
    UPDATE "Question"
    SET "subCategoryId" = "topicId" || '-default'
    WHERE "topicId" IS NOT NULL AND "subCategoryId" IS NULL;
  END IF;
END $$;

-- For practice questions still missing subcategory (should not happen after Topic migrate)
-- leave null only until purpose migration softens NOT NULL

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Question" WHERE "subCategoryId" IS NULL) THEN
    -- Attach orphaned questions to first subcategory of matching paper is not possible without paper link;
    -- create a holding row only if needed: require non-null for pre-purpose era
    NULL;
  END IF;
END $$;

-- Drop old FK and column if Topic model columns remain
ALTER TABLE "Question" DROP CONSTRAINT IF EXISTS "Question_topicId_fkey";
DROP INDEX IF EXISTS "Question_topicId_idx";
ALTER TABLE "Question" DROP COLUMN IF EXISTS "topicId";

-- Before purpose-optional migration, require subCategory when rows exist
UPDATE "Question" SET "subCategoryId" = (
  SELECT sc.id FROM "SubCategory" sc LIMIT 1
) WHERE "subCategoryId" IS NULL AND EXISTS (SELECT 1 FROM "SubCategory");

-- Only enforce NOT NULL when every question has a subcategory or none exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Question" WHERE "subCategoryId" IS NULL) THEN
    ALTER TABLE "Question" ALTER COLUMN "subCategoryId" SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Question_subCategoryId_idx" ON "Question"("subCategoryId");

DO $$ BEGIN
  ALTER TABLE "Question" ADD CONSTRAINT "Question_subCategoryId_fkey"
    FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Category_paperId_idx" ON "Category"("paperId");
DO $$ BEGIN
  ALTER TABLE "Category" ADD CONSTRAINT "Category_paperId_fkey"
    FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "SubCategory_categoryId_idx" ON "SubCategory"("categoryId");
DO $$ BEGIN
  ALTER TABLE "SubCategory" ADD CONSTRAINT "SubCategory_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP TABLE IF EXISTS "Topic";
