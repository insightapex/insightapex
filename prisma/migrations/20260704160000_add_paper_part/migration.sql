-- CreateEnum
CREATE TYPE "PaperPart" AS ENUM ('PART_1', 'PART_2', 'PART_3');

-- AlterTable
ALTER TABLE "Paper" ADD COLUMN "part" "PaperPart" NOT NULL DEFAULT 'PART_1';
