import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation";
import { sendPasswordResetEmail, EmailServiceError } from "@/services/email";
import {
  AUTH_RATE_LIMIT,
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rate = checkRateLimit(`forgot-password:${ip}`, AUTH_RATE_LIMIT);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec!);
  const body = await req.json();
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });

  // Always return success to avoid leaking which emails are registered
  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1h
      },
    });
    try {
      await sendPasswordResetEmail(user.email, token);
    } catch (emailErr) {
      console.error("Forgot password email error:", emailErr);
      if (emailErr instanceof EmailServiceError && emailErr.code === "MISSING_CONFIG") {
        console.error("RESEND_API_KEY or EMAIL_FROM is not configured.");
      }
    }
  }

  return NextResponse.json({ success: true });
}
