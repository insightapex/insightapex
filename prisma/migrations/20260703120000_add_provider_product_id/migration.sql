-- AlterTable
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "providerProductId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "providerProductId" TEXT;
