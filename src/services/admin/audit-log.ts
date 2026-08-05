import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AuditInput = {
  userId?: string | null;
  action: string;
  target?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
};

/** Best-effort audit write — never throws to callers. */
export async function logAdminAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        target: input.target ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        metadata:
          input.metadata == null
            ? undefined
            : (input.metadata as Prisma.InputJsonValue),
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch {
    // swallow — primary action should still succeed
  }
}
