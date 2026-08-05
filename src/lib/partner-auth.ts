import { getServerSession } from "next-auth";
import type { PartnerStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPartnerAdmin, isSuperAdmin } from "@/lib/roles";

export type PartnerContext = {
  userId: string;
  email: string | null | undefined;
  name: string | null | undefined;
  role: string;
  partnerId: string;
  partnerName: string;
  partnerSlug: string;
  partnerStatus: PartnerStatus;
  logoUrl: string | null;
};

/**
 * Resolve the authenticated partner admin's tenant from the session + PartnerMember.
 * Never trust partnerId from the client.
 */
export async function requirePartnerApi(): Promise<PartnerContext | null> {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id || !isPartnerAdmin(user.role)) return null;

  const membership = await prisma.partnerMember.findFirst({
    where: { userId: user.id, role: "PARTNER_ADMIN" },
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

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    partnerId: membership.partner.id,
    partnerName: membership.partner.name,
    partnerSlug: membership.partner.slug,
    partnerStatus: membership.partner.status,
    logoUrl: membership.partner.logoUrl,
  };
}

export async function requireSuperAdminApi() {
  const session = await getServerSession(authOptions);
  const user = session?.user;
  if (!user?.id || !isSuperAdmin(user.role)) return null;
  return user;
}

/** Ensure a student (or resource owner) belongs to this partner. */
export async function assertStudentBelongsToPartner(
  studentId: string,
  partnerId: string
): Promise<boolean> {
  const student = await prisma.user.findFirst({
    where: {
      id: studentId,
      role: "STUDENT",
      partnerId,
    },
    select: { id: true },
  });
  return Boolean(student);
}

/** Ensure a class belongs to this partner. */
export async function assertClassBelongsToPartner(
  classId: string,
  partnerId: string
): Promise<boolean> {
  const cls = await prisma.class.findFirst({
    where: { id: classId, partnerId },
    select: { id: true },
  });
  return Boolean(cls);
}
