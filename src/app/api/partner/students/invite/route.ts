import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePartnerApi } from "@/lib/partner-auth";
import { createAndSendPartnerInvitation } from "@/services/partner/invitations";
import { EmailServiceError } from "@/services/email";
import {
  isPartnerDemoStaticDataEnabled,
  PARTNER_DEMO_READ_ONLY_MESSAGE,
} from "@/lib/partner-demo-data";

const schema = z.object({
  email: z.string().email(),
  classId: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const ctx = await requirePartnerApi();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (isPartnerDemoStaticDataEnabled()) {
    return NextResponse.json({ error: PARTNER_DEMO_READ_ONLY_MESSAGE }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const invitation = await createAndSendPartnerInvitation({
      partnerId: ctx.partnerId,
      invitedById: ctx.userId,
      email: parsed.data.email,
      classId: parsed.data.classId,
      partnerName: ctx.partnerName,
    });

    return NextResponse.json({
      ok: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    });
  } catch (err) {
    if (err instanceof EmailServiceError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.code === "MISSING_CONFIG" ? 503 : 502 }
      );
    }
    const message = err instanceof Error ? err.message : "Could not send invitation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
