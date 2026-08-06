import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation";
import { sendVerificationEmail, EmailServiceError } from "@/services/email";
import {
  AUTH_RATE_LIMIT,
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rate = checkRateLimit(`register:${ip}`, AUTH_RATE_LIMIT);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec!);

  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const { name, email, password, schoolId, registrationSourceId } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const school = await prisma.partner.findFirst({
      where: {
        id: schoolId,
        status: "ACTIVE",
        allowPublicRegistration: true,
      },
      select: { id: true },
    });
    if (!school) {
      return NextResponse.json(
        { error: "Please select a valid school that is accepting registrations." },
        { status: 400 }
      );
    }

    const source = await prisma.registrationSource.findFirst({
      where: { id: registrationSourceId, isActive: true },
      select: { id: true },
    });
    if (!source) {
      return NextResponse.json(
        { error: "Please select a valid option for how you heard about us." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        partnerId: school.id,
        registrationSourceId: source.id,
        profile: { create: {} },
      },
    });

    // Create email verification token and send verification email
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24h
      },
    });

    try {
      await sendVerificationEmail(user.email, token);
    } catch (emailErr) {
      await prisma.verificationToken.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });

      if (emailErr instanceof EmailServiceError) {
        return NextResponse.json(
          { error: emailErr.message },
          { status: emailErr.code === "MISSING_CONFIG" ? 503 : 502 }
        );
      }
      return NextResponse.json(
        { error: "Could not send verification email. Please try again later." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
