import { NextRequest, NextResponse } from "next/server";
import { requirePartnerApi } from "@/lib/partner-auth";
import { getPartnerAnalytics, parsePartnerPeriod } from "@/services/partner/analytics";

export async function GET(req: NextRequest) {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const period = parsePartnerPeriod(req.nextUrl.searchParams.get("period"));
  const data = await getPartnerAnalytics(ctx.partnerId, period);
  return NextResponse.json(data);
}
