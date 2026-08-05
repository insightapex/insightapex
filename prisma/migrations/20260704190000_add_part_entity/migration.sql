-- Create Part entity and migrate Paper.part enum → paper.partId relation

CREATE TABLE "Part" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Part_code_key" ON "Part"("code");
CREATE INDEX "Part_order_idx" ON "Part"("order");
CREATE INDEX "Part_isActive_idx" ON "Part"("isActive");

-- Seed default parts matching former PaperPart enum
INSERT INTO "Part" ("id", "code", "title", "order", "isActive", "createdAt", "updatedAt")
VALUES
  ('part_seed_1', 'PART_1', 'Applied Knowledge', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('part_seed_2', 'PART_2', 'Applied Skills', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('part_seed_3', 'PART_3', 'Strategic Professional', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

ALTER TABLE "Paper" ADD COLUMN IF NOT EXISTS "partId" TEXT;

-- Map enum column if still present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Paper' AND column_name = 'part'
  ) THEN
    UPDATE "Paper" SET "partId" = CASE
      WHEN "part"::text = 'PART_2' THEN (SELECT id FROM "Part" WHERE code = 'PART_2' LIMIT 1)
      WHEN "part"::text = 'PART_3' THEN (SELECT id FROM "Part" WHERE code = 'PART_3' LIMIT 1)
      ELSE (SELECT id FROM "Part" WHERE code = 'PART_1' LIMIT 1)
    END
    WHERE "partId" IS NULL;
  ELSE
    UPDATE "Paper" SET "partId" = (SELECT id FROM "Part" WHERE code = 'PART_1' LIMIT 1)
    WHERE "partId" IS NULL;
  END IF;
END $$;

ALTER TABLE "Paper" ALTER COLUMN "partId" SET NOT NULL;

DO $$ BEGIN
  ALTER TABLE "Paper" ADD CONSTRAINT "Paper_partId_fkey"
    FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "Paper_partId_idx" ON "Paper"("partId");

-- Drop legacy enum column + type if present
ALTER TABLE "Paper" DROP COLUMN IF EXISTS "part";
DROP TYPE IF EXISTS "PaperPart";
