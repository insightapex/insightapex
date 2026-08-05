import { NextResponse } from "next/server";
import { requirePartnerApi } from "@/lib/partner-auth";
import { getPartnerCommissionTrend, parseTrendRange } from "@/services/partner/dashboard";

export async function GET(req: Request) {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const range = parseTrendRange(new URL(req.url).searchParams.get("range"));
  const data = await getPartnerCommissionTrend(ctx.partnerId, range);
  return NextResponse.json(data);
}
