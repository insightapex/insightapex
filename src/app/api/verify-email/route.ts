import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AUTH_RATE_LIMIT,
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rate = checkRateLimit(`verify-email:${ip}`, AUTH_RATE_LIMIT);
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec!);

  const { token } = await req.json();
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Missing verification token." }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token },
    include: { user: { select: { emailVerified: true } } },
  });

  if (!record) {
    return NextResponse.json(
      { error: "This verification link is invalid or has already been used." },
      { status: 400 }
    );
  }

  if (record.expiresAt < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    return NextResponse.json(
      { error: "This verification link has expired. Please register again or request a new link." },
      { status: 400 }
    );
  }

  if (record.user.emailVerified) {
    await prisma.verificationToken.delete({ where: { token } });
    return NextResponse.json({ success: true, alreadyVerified: true });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  return NextResponse.json({ success: true });
}
