-- Migration: add_mock_exams_and_billing_prep
-- Mock exams, billing/access prep models, and Paper access fields.

-- New enums
CREATE TYPE "MockExamStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TYPE "BillingAccessType" AS ENUM ('FREE', 'MONTHLY_SUBSCRIPTION', 'YEARLY_SUBSCRIPTION', 'ONE_TIME_PAPER', 'ONE_TIME_MOCK_EXAM', 'ADMIN_GRANTED');
CREATE TYPE "PlanBillingInterval" AS ENUM ('MONTHLY', 'YEARLY', 'ONE_TIME');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELED');
CREATE TYPE "ProductType" AS ENUM ('SUBSCRIPTION_PLAN', 'PAPER', 'MOCK_EXAM', 'QUESTION_PACK');
CREATE TYPE "UserAccessStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- Extend PurchaseType
ALTER TYPE "PurchaseType" ADD VALUE IF NOT EXISTS 'MOCK_EXAM';
ALTER TYPE "PurchaseType" ADD VALUE IF NOT EXISTS 'ONE_TIME_PAPER';
ALTER TYPE "PurchaseType" ADD VALUE IF NOT EXISTS 'ONE_TIME_MOCK_EXAM';

-- Paper access prep
ALTER TABLE "Paper" ADD COLUMN IF NOT EXISTS "isPremium" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Paper" ADD COLUMN IF NOT EXISTS "priceCents" INTEGER;
ALTER TABLE "Paper" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'USD';

-- Mock exams
CREATE TABLE IF NOT EXISTS "MockExam" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "durationMinutes" INTEGER NOT NULL DEFAULT 40,
    "passMarkPercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" "MockExamStatus" NOT NULL DEFAULT 'DRAFT',
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'FREE',
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "priceCents" INTEGER,
    "currency" TEXT DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MockExam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MockExamQuestion" (
    "id" TEXT NOT NULL,
    "mockExamId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "MockExamQuestion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "QuizAttempt" ADD COLUMN IF NOT EXISTS "mockExamId" TEXT;

-- Billing prep tables
CREATE TABLE IF NOT EXISTS "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "accessType" "BillingAccessType" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingInterval" "PlanBillingInterval" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "provider" TEXT,
    "providerPriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "accessType" "BillingAccessType" NOT NULL DEFAULT 'FREE',
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "priceCents" INTEGER,
    "currency" TEXT DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "planId" TEXT,
    "paperId" TEXT,
    "mockExamId" TEXT,
    "provider" TEXT,
    "providerPriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purchaseId" TEXT,
    "subscriptionId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "providerPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessType" "BillingAccessType" NOT NULL DEFAULT 'FREE',
    "paperId" TEXT,
    "mockExamId" TEXT,
    "questionId" TEXT,
    "status" "UserAccessStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "grantedById" TEXT,
    "purchaseId" TEXT,
    "subscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserAccess_pkey" PRIMARY KEY ("id")
);

-- Indexes and foreign keys (idempotent where possible)
CREATE UNIQUE INDEX IF NOT EXISTS "Plan_slug_key" ON "Plan"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_slug_key" ON "Product"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "MockExamQuestion_mockExamId_questionId_key" ON "MockExamQuestion"("mockExamId", "questionId");
CREATE INDEX IF NOT EXISTS "MockExam_paperId_idx" ON "MockExam"("paperId");
CREATE INDEX IF NOT EXISTS "MockExam_status_isActive_idx" ON "MockExam"("status", "isActive");
CREATE INDEX IF NOT EXISTS "QuizAttempt_mockExamId_idx" ON "QuizAttempt"("mockExamId");
