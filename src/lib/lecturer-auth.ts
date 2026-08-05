import { getServerSession } from "next-auth";
import type { PartnerStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLecturer } from "@/lib/roles";
import { applyLecturerDemoAssignments } from "@/lib/lecturer-demo-data";

export type LecturerContext = {
  userId: string;
  email: string | null | undefined;
  name: string | null | undefined;
  role: string;
  partnerId: string;
  partnerName: string;
  partnerSlug: string;
  partnerStatus: PartnerStatus;
  logoUrl: string | null;
  membershipId: string;
  /** Paper IDs assigned to this lecturer within their school. */
  paperIds: string[];
  /** Class IDs assigned to this lecturer within their school. */
  classIds: string[];
};

/**
 * Resolve the authenticated lecturer's tenant + assignments from the session.
 * Never trust partnerId / lecturerId / schoolId from the client.
 * Paper/class scope is always school-assigned (or demo fixtures when demo mode is on).
 */
export async function requireLecturerApi(): Promise<LecturerContext | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id || !isLecturer(user.role)) return null;

  const membership = await prisma.partnerMember.findFirst({
    where: { userId: user.id, role: "LECTURER" },
    include: {
      partner: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          logoUrl: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) return null;
  if (membership.partner.status === "SUSPENDED") return null;

  const partnerId = membership.partner.id;

  const [paperAssignments, classAssignments] = await Promise.all([
    prisma.lecturerPaperAssignment.findMany({
      where: { lecturerId: user.id, partnerId },
      select: { paperId: true },
    }),
    prisma.lecturerClassAssignment.findMany({
      where: { lecturerId: user.id, partnerId },
      select: { classId: true },
    }),
  ]);

  const ctx: LecturerContext = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    partnerId,
    partnerName: membership.partner.name,
    partnerSlug: membership.partner.slug,
    partnerStatus: membership.partner.status,
    logoUrl: membership.partner.logoUrl,
    membershipId: membership.id,
    paperIds: paperAssignments.map((a) => a.paperId),
    classIds: classAssignments.map((a) => a.classId),
  };

  return applyLecturerDemoAssignments(ctx);
}

/** Ensure the paper is assigned to this lecturer at this partner. */
export function assertPaperAssignedToLecturer(
  paperId: string,
  ctx: LecturerContext
): boolean {
  return ctx.paperIds.includes(paperId);
}

/** Ensure a student belongs to this lecturer's school and (if classes assigned) one of those classes. */
export async function assertStudentVisibleToLecturer(
  studentId: string,
  ctx: LecturerContext
): Promise<boolean> {
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: "STUDENT",
      partnerId: ctx.partnerId,
    },
    select: { id: true },
  });
  if (!student) return false;

  if (ctx.classIds.length === 0) {
    // No class assignments yet — do not expose all school students.
    return false;
  }

  const enrollment = await prisma.classStudent.findFirst({
    where: {
      studentId,
      classId: { in: ctx.classIds },
      class: { partnerId: ctx.partnerId },
    },
    select: { id: true },
  });
  return Boolean(enrollment);
}

/** Student IDs visible to this lecturer (assigned classes ∩ school). */
export async function getLecturerStudentIds(ctx: LecturerContext): Promise<string[]> {
  if (ctx.classIds.length === 0) return [];

  const rows = await prisma.classStudent.findMany({
    where: {
      classId: { in: ctx.classIds },
      class: { partnerId: ctx.partnerId },
      student: { role: "STUDENT", partnerId: ctx.partnerId },
    },
    select: { studentId: true },
  });
  return Array.from(new Set(rows.map((r) => r.studentId)));
}
