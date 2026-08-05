import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  allowPublicRegistration: z.boolean().optional(),
  commissionRatePercent: z.number().min(0).max(100).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")).nullable(),
  name: z.string().min(2).max(120).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { partnerId: string } }
) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const existing = await prisma.partner.findUnique({ where: { id: params.partnerId } });
  if (!existing) {
    return NextResponse.json({ error: "Partner not found." }, { status: 404 });
  }

  const data = parsed.data;
  const updated = await prisma.partner.update({
    where: { id: params.partnerId },
    data: {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.allowPublicRegistration !== undefined
        ? { allowPublicRegistration: data.allowPublicRegistration }
        : {}),
      ...(data.commissionRatePercent !== undefined
        ? { commissionRate: data.commissionRatePercent / 100 }
        : {}),
      ...(data.contactEmail !== undefined
        ? { contactEmail: data.contactEmail?.trim() || null }
        : {}),
    },
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    status: updated.status,
  });
}
