import { NextResponse } from "next/server";
import { requirePartnerApi } from "@/lib/partner-auth";
import { prisma } from "@/lib/prisma";
import {
  isPartnerDemoStaticDataEnabled,
  partnerDemoAssignmentOptions,
} from "@/lib/partner-demo-data";

/** Papers + classes available for lecturer assignment within this partner. */
export async function GET() {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (isPartnerDemoStaticDataEnabled()) {
    return NextResponse.json(partnerDemoAssignmentOptions());
  }

  const [papers, classes] = await Promise.all([
    prisma.paper.findMany({
      where: { isActive: true },
      select: { id: true, code: true, title: true },
      orderBy: [{ code: "asc" }],
    }),
    prisma.class.findMany({
      where: { partnerId: ctx.partnerId, status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ papers, classes });
}
