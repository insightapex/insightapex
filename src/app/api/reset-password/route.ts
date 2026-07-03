import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validation";
import {
  AUTH_RATE_LIMIT,
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rate = checkRateLimit(`reset-password:${ip}`, AUTH_RATE_LIMIT);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec!);
  const body = await req.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { token, password } = parsed.data;
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } }),
  ]);

  return NextResponse.json({ success: true });
}
