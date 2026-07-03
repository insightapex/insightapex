import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendVerificationEmail, EmailServiceError } from "@/services/email";
import {
  AUTH_RATE_LIMIT,
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rate = checkRateLimit(`resend-verification:${ip}`, AUTH_RATE_LIMIT);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec!);

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success to avoid leaking which emails exist
  if (!user || user.emailVerified) {
    return NextResponse.json({
      success: true,
      message: "If an unverified account exists, a new verification email has been sent.",
    });
  }

  await prisma.verificationToken.deleteMany({ where: { userId: user.id } });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  try {
    await sendVerificationEmail(user.email, token);
  } catch (emailErr) {
    console.error("Resend verification email error:", emailErr);
    if (emailErr instanceof EmailServiceError) {
      return NextResponse.json({ error: emailErr.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Could not send verification email. Please try again later." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Verification email sent. Check your inbox and spam folder.",
  });
}
