import { NextResponse } from "next/server";
import { requirePartnerApi } from "@/lib/partner-auth";
import { getPartnerOverview } from "@/services/partner/dashboard";

export async function GET() {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const overview = await getPartnerOverview(ctx.partnerId);
  return NextResponse.json(overview);
}
