import { NextResponse } from "next/server";
import { getPlatformSettings } from "@/services/platform-settings";

/** Public maintenance flags for middleware. Keep payload minimal. */
export async function GET() {
  const settings = await getPlatformSettings();

  return NextResponse.json(
    {
      maintenanceMode: settings.maintenanceMode,
      maintenanceAdminAccess: settings.maintenanceAdminAccess,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    }
  );
}
