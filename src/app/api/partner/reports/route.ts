import { NextResponse } from "next/server";
import { requirePartnerApi } from "@/lib/partner-auth";
import { getPartnerDashboardStats } from "@/services/partner/analytics";

/** School learning snapshot used by Partner Reports. */
export async function GET() {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const data = await getPartnerDashboardStats(ctx.partnerId);
  return NextResponse.json(data);
}
