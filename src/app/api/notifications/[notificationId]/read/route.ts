import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { markNotificationRead } from "@/services/notifications";

export async function PATCH(
  _req: Request,
  { params }: { params: { notificationId: string } }
) {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const updated = await markNotificationRead(params.notificationId, user.id);
    if (!updated) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[api/notifications/read]", error);
    return NextResponse.json({ error: "Could not update notification." }, { status: 500 });
  }
}
