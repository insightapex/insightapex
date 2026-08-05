-- Partner commission, public registration flag, payout ledger, registration sources

ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.3;
ALTER TABLE "Partner" ADD COLUMN IF NOT EXISTS "allowPublicRegistration" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "Partner_allowPublicRegistration_idx" ON "Partner"("allowPublicRegistration");

CREATE TABLE "PartnerPayout" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartnerPayout_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PartnerPayout_partnerId_idx" ON "PartnerPayout"("partnerId");
CREATE INDEX "PartnerPayout_partnerId_createdAt_idx" ON "PartnerPayout"("partnerId", "createdAt");
ALTER TABLE "PartnerPayout" ADD CONSTRAINT "PartnerPayout_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RegistrationSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RegistrationSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationSource_slug_key" ON "RegistrationSource"("slug");
CREATE INDEX "RegistrationSource_isActive_idx" ON "RegistrationSource"("isActive");
CREATE INDEX "RegistrationSource_order_idx" ON "RegistrationSource"("order");

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "registrationSourceId" TEXT;
CREATE INDEX IF NOT EXISTS "User_registrationSourceId_idx" ON "User"("registrationSourceId");
DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_registrationSourceId_fkey"
    FOREIGN KEY ("registrationSourceId") REFERENCES "RegistrationSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
