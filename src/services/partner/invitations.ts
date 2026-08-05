import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPartnerInvitationEmail } from "@/services/email";

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function slugifyPartnerName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "partner";
}

export async function uniquePartnerSlug(base: string): Promise<string> {
  let slug = slugifyPartnerName(base);
  let n = 0;
  while (await prisma.partner.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${slugifyPartnerName(base)}-${n}`;
  }
  return slug;
}

type InviteInput = {
  partnerId: string;
  invitedById: string;
  email: string;
  classId?: string | null;
  partnerName: string;
};

export async function createAndSendPartnerInvitation(input: InviteInput) {
  const email = input.email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    if (existingUser.role !== "STUDENT") {
      throw new Error("Only student accounts can be invited.");
    }
    if (existingUser.partnerId && existingUser.partnerId !== input.partnerId) {
      throw new Error("This student already belongs to another partner.");
    }
    if (existingUser.partnerId === input.partnerId) {
      throw new Error("This student is already linked to your organisation.");
    }
  }

  if (input.classId) {
    const cls = await prisma.class.findFirst({
      where: { id: input.classId, partnerId: input.partnerId },
      select: { id: true },
    });
    if (!cls) throw new Error("Class not found.");
  }

  // Revoke prior pending invites for same email+partner
  await prisma.partnerInvitation.updateMany({
    where: {
      partnerId: input.partnerId,
      email,
      acceptedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const invitation = await prisma.partnerInvitation.create({
    data: {
      partnerId: input.partnerId,
      email,
      token,
      invitedById: input.invitedById,
      classId: input.classId || null,
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    },
  });

  await sendPartnerInvitationEmail(email, token, input.partnerName);

  return invitation;
}

export async function acceptPartnerInvitation(token: string, userId: string) {
  const invitation = await prisma.partnerInvitation.findUnique({
    where: { token },
    include: { partner: { select: { id: true, name: true, status: true } } },
  });

  if (!invitation) {
    return { ok: false as const, error: "Invitation not found." };
  }
  if (invitation.revokedAt) {
    return { ok: false as const, error: "This invitation has been revoked." };
  }
  if (invitation.acceptedAt) {
    return { ok: false as const, error: "This invitation has already been used." };
  }
  if (invitation.expiresAt.getTime() < Date.now()) {
    return { ok: false as const, error: "This invitation has expired." };
  }
  if (invitation.partner.status === "SUSPENDED") {
    return { ok: false as const, error: "This partner organisation is suspended." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "STUDENT") {
    return { ok: false as const, error: "Only students can accept partner invitations." };
  }
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return {
      ok: false as const,
      error: "Sign in with the invited email address to accept this invitation.",
    };
  }
  if (user.partnerId && user.partnerId !== invitation.partnerId) {
    return { ok: false as const, error: "You already belong to another partner." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { partnerId: invitation.partnerId },
    });

    if (invitation.classId) {
      const cls = await tx.class.findFirst({
        where: { id: invitation.classId, partnerId: invitation.partnerId },
      });
      if (cls) {
        await tx.classStudent.upsert({
          where: {
            classId_studentId: {
              classId: invitation.classId,
              studentId: userId,
            },
          },
          create: { classId: invitation.classId, studentId: userId },
          update: {},
        });
      }
    }

    await tx.partnerInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
  });

  return { ok: true as const, partnerName: invitation.partner.name };
}
