import { z } from "zod";
import type { LecturerContext } from "@/lib/lecturer-auth";
import { getLecturerStudentIds } from "@/lib/lecturer-auth";
import { ADMIN_AUDIT_ACTIONS } from "@/lib/admin-audit";
import { prisma } from "@/lib/prisma";
import { logAdminAudit } from "@/services/admin/audit-log";
import { createNotification } from "@/services/notifications";
import { sendLecturerMessageEmail } from "@/services/email";

export const lecturerNotifySchema = z.object({
  mode: z.enum(["students", "class"]),
  studentIds: z.array(z.string()).optional(),
  classId: z.string().optional(),
  subject: z.string().min(3).max(120),
  message: z.string().min(3).max(4000),
  sendEmail: z.boolean().default(false),
  sendInApp: z.boolean().default(true),
});

export type LecturerNotifyInput = z.infer<typeof lecturerNotifySchema>;

export async function sendLecturerNotifications(
  ctx: LecturerContext,
  input: LecturerNotifyInput
) {
  const visibleIds = await getLecturerStudentIds(ctx);
  let targetIds: string[] = [];

  if (input.mode === "class") {
    if (!input.classId || !ctx.classIds.includes(input.classId)) {
      return { ok: false as const, error: "Class is not assigned to you.", status: 403 };
    }
    const rows = await prisma.classStudent.findMany({
      where: {
        classId: input.classId,
        class: { partnerId: ctx.partnerId },
        studentId: { in: visibleIds },
      },
      select: { studentId: true },
    });
    targetIds = rows.map((r) => r.studentId);
  } else {
    const requested = input.studentIds ?? [];
    targetIds = requested.filter((id) => visibleIds.includes(id));
    if (targetIds.length === 0) {
      return { ok: false as const, error: "No valid students selected.", status: 400 };
    }
  }

  const students = await prisma.user.findMany({
    where: { id: { in: targetIds }, partnerId: ctx.partnerId, role: "STUDENT" },
    select: { id: true, name: true, email: true },
  });

  const lecturerName = ctx.name ?? "Your lecturer";
  let emailed = 0;
  let notified = 0;
  const errors: string[] = [];

  for (const student of students) {
    if (input.sendInApp) {
      await createNotification({
        userId: student.id,
        type: "LECTURER_MESSAGE",
        title: input.subject,
        message: input.message,
        href: "/dashboard/quiz",
      });
      notified += 1;
    }
    if (input.sendEmail) {
      try {
        await sendLecturerMessageEmail({
          to: student.email,
          lecturerName,
          schoolName: ctx.partnerName,
          subject: input.subject,
          message: input.message,
        });
        emailed += 1;
      } catch (e) {
        errors.push(`${student.email}: ${e instanceof Error ? e.message : "email failed"}`);
      }
    }
  }

  await logAdminAudit({
    userId: ctx.userId,
    action: ADMIN_AUDIT_ACTIONS.LECTURER_NOTIFY,
    target: ctx.partnerName,
    targetType: "lecturer_notify",
    targetId: ctx.partnerId,
    metadata: {
      subject: input.subject,
      mode: input.mode,
      classId: input.classId ?? null,
      recipientCount: students.length,
      emailed,
      notified,
      errors: errors.slice(0, 10),
    },
  });

  return {
    ok: true as const,
    recipientCount: students.length,
    emailed,
    notified,
    errors,
  };
}
