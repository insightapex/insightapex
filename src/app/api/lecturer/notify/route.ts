import { NextResponse } from "next/server";
import { requireLecturerApi } from "@/lib/lecturer-auth";
import { lecturerNotifySchema, sendLecturerNotifications } from "@/services/lecturer/notify";
import {
  isLecturerDemoStaticDataEnabled,
  lecturerDemoStudentById,
} from "@/lib/lecturer-demo-data";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/services/notifications";

export async function POST(req: Request) {
  const ctx = await requireLecturerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = lecturerNotifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  // Demo walkthrough: keep fake students looking good, but deliver real in-app
  // notifications when the demo row maps to a live account (e.g. Sarah Johnson).
  if (isLecturerDemoStaticDataEnabled()) {
    const requestedIds =
      parsed.data.mode === "students" ? parsed.data.studentIds ?? [] : [];
    let liveNotified = 0;

    if (parsed.data.sendInApp !== false) {
      for (const id of requestedIds) {
        const demoStudent = lecturerDemoStudentById(id);
        if (!demoStudent) continue;

        const liveUser = await prisma.user.findUnique({
          where: { email: demoStudent.email.toLowerCase() },
          select: { id: true, role: true },
        });
        if (!liveUser || liveUser.role !== "STUDENT") continue;

        await createNotification({
          userId: liveUser.id,
          type: "LECTURER_MESSAGE",
          title: parsed.data.subject,
          message: parsed.data.message,
          href: "/dashboard/quiz",
        });
        liveNotified += 1;
      }
    }

    const recipientCount =
      parsed.data.mode === "class"
        ? Math.max(1, liveNotified)
        : Math.max(1, requestedIds.length);

    return NextResponse.json({
      ok: true,
      demo: liveNotified === 0,
      recipientCount,
      emailed: 0,
      notified: liveNotified > 0 ? liveNotified : recipientCount,
      liveNotified,
      errors: [],
      message:
        liveNotified > 0
          ? "In-app notification delivered to live student account(s)."
          : "Demo notification sent (lecturer demo static data).",
    });
  }

  const result = await sendLecturerNotifications(ctx, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
