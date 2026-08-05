import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { parseAnalyticsPeriod } from "@/lib/admin-analytics-types";
import { getPlatformAnalytics } from "@/services/admin/platform-analytics";

export async function GET(req: Request) {
  if (!(await requireAdminApi())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const period = parseAnalyticsPeriod(url.searchParams.get("period"));
  let paperId = url.searchParams.get("paperId") || null;
  const subCategoryId = url.searchParams.get("subCategoryId") || null;

  if (subCategoryId && !paperId) {
    const subCategory = await prisma.subCategory.findUnique({
      where: { id: subCategoryId },
      select: { category: { select: { paperId: true } } },
    });
    if (subCategory) {
      paperId = subCategory.category.paperId;
    }
  }

  try {
    const analytics = await getPlatformAnalytics({ period, paperId, subCategoryId });
    return NextResponse.json(analytics);
  } catch (error) {
    console.error("[admin/analytics]", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
