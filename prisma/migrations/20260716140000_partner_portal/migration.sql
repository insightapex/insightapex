-- Partner portal: tenants, classes, memberships, invitations

CREATE TYPE "PartnerStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "ClassStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "PartnerMemberRole" AS ENUM ('PARTNER_ADMIN');

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PARTNER_ADMIN';

CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "contactEmail" TEXT,
    "status" "PartnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Partner_slug_key" ON "Partner"("slug");
CREATE INDEX "Partner_status_idx" ON "Partner"("status");

CREATE TABLE "PartnerMember" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PartnerMemberRole" NOT NULL DEFAULT 'PARTNER_ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PartnerMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartnerMember_partnerId_userId_key" ON "PartnerMember"("partnerId", "userId");
CREATE INDEX "PartnerMember_userId_idx" ON "PartnerMember"("userId");
CREATE INDEX "PartnerMember_partnerId_idx" ON "PartnerMember"("partnerId");

ALTER TABLE "PartnerMember" ADD CONSTRAINT "PartnerMember_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerMember" ADD CONSTRAINT "PartnerMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ClassStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Class_partnerId_idx" ON "Class"("partnerId");
CREATE INDEX "Class_partnerId_status_idx" ON "Class"("partnerId", "status");
ALTER TABLE "Class" ADD CONSTRAINT "Class_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ClassStudent" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassStudent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassStudent_classId_studentId_key" ON "ClassStudent"("classId", "studentId");
CREATE INDEX "ClassStudent_studentId_idx" ON "ClassStudent"("studentId");
CREATE INDEX "ClassStudent_classId_idx" ON "ClassStudent"("classId");
ALTER TABLE "ClassStudent" ADD CONSTRAINT "ClassStudent_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassStudent" ADD CONSTRAINT "ClassStudent_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PartnerInvitation" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "classId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PartnerInvitation_token_key" ON "PartnerInvitation"("token");
CREATE INDEX "PartnerInvitation_partnerId_email_idx" ON "PartnerInvitation"("partnerId", "email");
CREATE INDEX "PartnerInvitation_token_idx" ON "PartnerInvitation"("token");
CREATE INDEX "PartnerInvitation_expiresAt_idx" ON "PartnerInvitation"("expiresAt");
ALTER TABLE "PartnerInvitation" ADD CONSTRAINT "PartnerInvitation_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PartnerInvitation" ADD CONSTRAINT "PartnerInvitation_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "partnerId" TEXT;
CREATE INDEX IF NOT EXISTS "User_partnerId_idx" ON "User"("partnerId");
DO $$ BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_partnerId_fkey"
    FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
