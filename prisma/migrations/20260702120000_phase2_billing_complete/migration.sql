-- Phase 2: complete billing tables and schema updates

-- User Stripe customer ID
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
CREATE INDEX IF NOT EXISTS "User_stripeCustomerId_idx" ON "User"("stripeCustomerId");

-- Plan features and default currency
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "features" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Plan" ALTER COLUMN "currency" SET DEFAULT 'GBP';

-- Product description
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Product" ALTER COLUMN "currency" SET DEFAULT 'GBP';

-- Subscription table
CREATE TABLE IF NOT EXISTS "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "status" "SubscriptionStatus" NOT NULL,
    "accessType" "BillingAccessType" NOT NULL DEFAULT 'MONTHLY_SUBSCRIPTION',
    "priceCents" INTEGER,
    "currency" TEXT DEFAULT 'GBP',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "provider" TEXT,
    "providerCustomerId" TEXT,
    "providerSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- Purchase table
CREATE TABLE IF NOT EXISTS "Purchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "type" "PurchaseType" NOT NULL,
    "accessType" "BillingAccessType" NOT NULL DEFAULT 'FREE',
    "paperId" TEXT,
    "mockExamId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER,
    "currency" TEXT DEFAULT 'GBP',
    "provider" TEXT,
    "providerPaymentId" TEXT,
    "stripePaymentId" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- Foreign keys (idempotent)
DO $$ BEGIN
  ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_mockExamId_fkey" FOREIGN KEY ("mockExamId") REFERENCES "MockExam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_mockExamId_fkey" FOREIGN KEY ("mockExamId") REFERENCES "MockExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "UserAccess" ADD CONSTRAINT "UserAccess_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Product" ADD CONSTRAINT "Product_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Product" ADD CONSTRAINT "Product_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Product" ADD CONSTRAINT "Product_mockExamId_fkey" FOREIGN KEY ("mockExamId") REFERENCES "MockExam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX IF NOT EXISTS "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS "Subscription_stripeCustomerId_idx" ON "Subscription"("stripeCustomerId");
CREATE INDEX IF NOT EXISTS "Purchase_userId_idx" ON "Purchase"("userId");
CREATE INDEX IF NOT EXISTS "Purchase_stripePaymentId_idx" ON "Purchase"("stripePaymentId");
CREATE INDEX IF NOT EXISTS "Purchase_status_idx" ON "Purchase"("status");
CREATE INDEX IF NOT EXISTS "UserAccess_userId_status_idx" ON "UserAccess"("userId", "status");
