-- Platform settings singleton + admin audit log

CREATE TABLE "PlatformSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "platformName" TEXT NOT NULL DEFAULT 'InsightApex',
    "supportEmail" TEXT NOT NULL DEFAULT 'support@insightapex.com',
    "platformUrl" TEXT NOT NULL DEFAULT 'http://localhost:3000',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "allowRegistration" BOOLEAN NOT NULL DEFAULT true,
    "requireEmailVerification" BOOLEAN NOT NULL DEFAULT true,
    "allowBookmarks" BOOLEAN NOT NULL DEFAULT true,
    "allowQuestionFlagging" BOOLEAN NOT NULL DEFAULT true,
    "allowDifficultyRating" BOOLEAN NOT NULL DEFAULT true,
    "allowAnswerReview" BOOLEAN NOT NULL DEFAULT true,
    "studentSessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 120,
    "defaultPassMark" INTEGER NOT NULL DEFAULT 50,
    "defaultTimerMinutes" INTEGER NOT NULL DEFAULT 40,
    "randomiseQuestions" BOOLEAN NOT NULL DEFAULT true,
    "randomiseAnswerOptions" BOOLEAN NOT NULL DEFAULT true,
    "allowPreviousQuestion" BOOLEAN NOT NULL DEFAULT true,
    "showExplanationAfterCheck" BOOLEAN NOT NULL DEFAULT true,
    "enableNegativeMarking" BOOLEAN NOT NULL DEFAULT false,
    "enableMonthlyPlan" BOOLEAN NOT NULL DEFAULT true,
    "enableYearlyPlan" BOOLEAN NOT NULL DEFAULT true,
    "enablePaperPurchases" BOOLEAN NOT NULL DEFAULT true,
    "enableMockExamPurchases" BOOLEAN NOT NULL DEFAULT true,
    "senderName" TEXT NOT NULL DEFAULT 'InsightApex',
    "senderEmail" TEXT NOT NULL DEFAULT 'onboarding@resend.dev',
    "enableVerificationEmails" BOOLEAN NOT NULL DEFAULT true,
    "enableResetPasswordEmails" BOOLEAN NOT NULL DEFAULT true,
    "minPasswordLength" INTEGER NOT NULL DEFAULT 8,
    "maxLoginAttempts" INTEGER NOT NULL DEFAULT 10,
    "adminSessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 480,
    "requireAdmin2fa" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceAdminAccess" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
CREATE INDEX "AdminAuditLog_action_idx" ON "AdminAuditLog"("action");
CREATE INDEX "AdminAuditLog_userId_idx" ON "AdminAuditLog"("userId");

DO $$ BEGIN
  ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
