-- Lecturer portal: assignments + role / member-role extensions

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'LECTURER';
ALTER TYPE "PartnerMemberRole" ADD VALUE IF NOT EXISTS 'LECTURER';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LECTURER_MESSAGE';

CREATE TABLE "LecturerPaperAssignment" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LecturerPaperAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LecturerPaperAssignment_lecturerId_paperId_key"
  ON "LecturerPaperAssignment"("lecturerId", "paperId");
CREATE INDEX "LecturerPaperAssignment_partnerId_idx" ON "LecturerPaperAssignment"("partnerId");
CREATE INDEX "LecturerPaperAssignment_lecturerId_idx" ON "LecturerPaperAssignment"("lecturerId");
CREATE INDEX "LecturerPaperAssignment_paperId_idx" ON "LecturerPaperAssignment"("paperId");
CREATE INDEX "LecturerPaperAssignment_partnerId_lecturerId_idx"
  ON "LecturerPaperAssignment"("partnerId", "lecturerId");

ALTER TABLE "LecturerPaperAssignment" ADD CONSTRAINT "LecturerPaperAssignment_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LecturerPaperAssignment" ADD CONSTRAINT "LecturerPaperAssignment_lecturerId_fkey"
  FOREIGN KEY ("lecturerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LecturerPaperAssignment" ADD CONSTRAINT "LecturerPaperAssignment_paperId_fkey"
  FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "LecturerClassAssignment" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "lecturerId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LecturerClassAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LecturerClassAssignment_lecturerId_classId_key"
  ON "LecturerClassAssignment"("lecturerId", "classId");
CREATE INDEX "LecturerClassAssignment_partnerId_idx" ON "LecturerClassAssignment"("partnerId");
CREATE INDEX "LecturerClassAssignment_lecturerId_idx" ON "LecturerClassAssignment"("lecturerId");
CREATE INDEX "LecturerClassAssignment_classId_idx" ON "LecturerClassAssignment"("classId");
CREATE INDEX "LecturerClassAssignment_partnerId_lecturerId_idx"
  ON "LecturerClassAssignment"("partnerId", "lecturerId");

ALTER TABLE "LecturerClassAssignment" ADD CONSTRAINT "LecturerClassAssignment_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LecturerClassAssignment" ADD CONSTRAINT "LecturerClassAssignment_lecturerId_fkey"
  FOREIGN KEY ("lecturerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LecturerClassAssignment" ADD CONSTRAINT "LecturerClassAssignment_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
