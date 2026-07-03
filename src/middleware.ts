import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_RATE_LIMIT, checkRateLimit } from "@/lib/rate-limit";

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path.startsWith("/api/auth") && req.method === "POST") {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`auth:${ip}`, AUTH_RATE_LIMIT);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec ?? 60) } }
      );
    }
  }

  if (path.startsWith("/admin") && path !== "/admin/login") {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/auth/:path*"],
};
