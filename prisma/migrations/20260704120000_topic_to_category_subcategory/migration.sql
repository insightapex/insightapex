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

-- Migrate Topic rows to Category (preserve IDs)
INSERT INTO "Category" ("id", "paperId", "title", "description", "isActive", "order", "createdAt", "updatedAt")
SELECT "id", "paperId", "title", "description", "isActive", "order", "createdAt", "updatedAt"
FROM "Topic";

-- Create default SubCategory per migrated Category
INSERT INTO "SubCategory" ("id", "categoryId", "title", "description", "isActive", "order", "createdAt", "updatedAt")
SELECT
    "id" || '-default',
    "id",
    'General',
    'Migrated from topic',
    true,
    0,
    "createdAt",
    "updatedAt"
FROM "Category";

-- Add subCategoryId to Question and migrate from topicId
ALTER TABLE "Question" ADD COLUMN "subCategoryId" TEXT;

UPDATE "Question"
SET "subCategoryId" = "topicId" || '-default'
WHERE "topicId" IS NOT NULL;

ALTER TABLE "Question" ALTER COLUMN "subCategoryId" SET NOT NULL;

-- Drop old FK and column
ALTER TABLE "Question" DROP CONSTRAINT IF EXISTS "Question_topicId_fkey";
DROP INDEX IF EXISTS "Question_topicId_idx";
ALTER TABLE "Question" DROP COLUMN "topicId";

CREATE INDEX "Question_subCategoryId_idx" ON "Question"("subCategoryId");
ALTER TABLE "Question" ADD CONSTRAINT "Question_subCategoryId_fkey"
    FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Category / SubCategory FKs and indexes
CREATE INDEX "Category_paperId_idx" ON "Category"("paperId");
ALTER TABLE "Category" ADD CONSTRAINT "Category_paperId_fkey"
    FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "SubCategory_categoryId_idx" ON "SubCategory"("categoryId");
ALTER TABLE "SubCategory" ADD CONSTRAINT "SubCategory_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop Topic table
DROP TABLE "Topic";
