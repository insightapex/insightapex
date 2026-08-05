import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const createSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(60).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  commissionRatePercent: z.number().min(0).max(100).default(30),
  allowPublicRegistration: z.boolean().default(true),
  adminName: z.string().min(2).max(120).optional(),
  adminEmail: z.string().email().optional(),
  adminPassword: z.string().min(8).optional(),
});

export async function GET(req: Request) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";

  const partners = await prisma.partner.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { contactEmail: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { students: true, members: true, classes: true } },
      members: {
        where: { role: "PARTNER_ADMIN" },
        take: 3,
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  return NextResponse.json({
    partners: partners.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      contactEmail: p.contactEmail,
      status: p.status,
      commissionRatePercent: Math.round(p.commissionRate * 1000) / 10,
      allowPublicRegistration: p.allowPublicRegistration,
      studentCount: p._count.students,
      memberCount: p._count.members,
      classCount: p._count.classes,
      admins: p.members.map((m) => m.user),
      createdAt: p.createdAt.toISOString(),
    })),
    total: partners.length,
  });
}

export async function POST(req: Request) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const slug = slugify(data.slug || data.name);
  if (!slug) {
    return NextResponse.json({ error: "A valid slug is required." }, { status: 400 });
  }

  const existingSlug = await prisma.partner.findUnique({ where: { slug } });
  if (existingSlug) {
    return NextResponse.json({ error: "That slug is already in use." }, { status: 409 });
  }

  const wantsAdmin = Boolean(data.adminEmail || data.adminPassword || data.adminName);
  if (wantsAdmin) {
    if (!data.adminName || !data.adminEmail || !data.adminPassword) {
      return NextResponse.json(
        { error: "Partner admin requires name, email, and password." },
        { status: 400 }
      );
    }
    const adminEmail = data.adminEmail.toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (existingUser) {
      return NextResponse.json({ error: "Admin email is already registered." }, { status: 409 });
    }
  }

  const partner = await prisma.$transaction(async (tx) => {
    const created = await tx.partner.create({
      data: {
        name: data.name.trim(),
        slug,
        contactEmail: data.contactEmail?.trim() || null,
        commissionRate: data.commissionRatePercent / 100,
        allowPublicRegistration: data.allowPublicRegistration,
        status: "ACTIVE",
      },
    });

    if (wantsAdmin && data.adminName && data.adminEmail && data.adminPassword) {
      const passwordHash = await bcrypt.hash(data.adminPassword, 10);
      const admin = await tx.user.create({
        data: {
          name: data.adminName.trim(),
          email: data.adminEmail.toLowerCase(),
          passwordHash,
          role: "PARTNER_ADMIN",
          emailVerified: new Date(),
        },
      });
      await tx.partnerMember.create({
        data: {
          partnerId: created.id,
          userId: admin.id,
          role: "PARTNER_ADMIN",
        },
      });
    }

    return created;
  });

  return NextResponse.json(
    {
      id: partner.id,
      name: partner.name,
      slug: partner.slug,
    },
    { status: 201 }
  );
}
