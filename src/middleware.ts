import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { AUTH_RATE_LIMIT, checkRateLimit } from "@/lib/rate-limit";
import { isContentAdminAllowedPath } from "@/lib/roles";

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

function homeForRole(role: unknown): string {
  if (role === "OWNER" || role === "CONTENT_ADMIN") return "/admin";
  if (role === "PARTNER_ADMIN") return "/partner";
  if (role === "LECTURER") return "/lecturer";
  return "/dashboard";
}

const MAINTENANCE_BLOCKED_PREFIXES = [
  "/dashboard",
  "/register",
  "/login",
  "/pricing",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
];

async function getMaintenanceFlags(req: NextRequest) {
  try {
    const res = await fetch(new URL("/api/settings/public", req.url), {
      headers: { "x-maintenance-check": "1" },
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      maintenanceMode?: boolean;
      maintenanceAdminAccess?: boolean;
    };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path === "/api/auth/callback/credentials" && req.method === "POST") {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`auth:${ip}`, AUTH_RATE_LIMIT);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please wait a few minutes and try again." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSec ?? 60) } }
      );
    }
  }

  const maintenance = await getMaintenanceFlags(req);
  if (maintenance?.maintenanceMode && path !== "/maintenance") {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const isOwner = token?.role === "OWNER";
    const blocked = MAINTENANCE_BLOCKED_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`)
    );

    if (blocked && !(maintenance.maintenanceAdminAccess && isOwner)) {
      return NextResponse.redirect(new URL("/maintenance", req.url));
    }
  }

  if (path.startsWith("/admin") && path !== "/admin/login") {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    if (token.role !== "OWNER" && token.role !== "CONTENT_ADMIN") {
      return NextResponse.redirect(new URL(homeForRole(token.role), req.url));
    }
    if (token.role === "CONTENT_ADMIN" && !isContentAdminAllowedPath(path)) {
      return NextResponse.redirect(new URL("/admin/questions", req.url));
    }
  }

  // Partner Portal — separate from student dashboard; PARTNER_ADMIN only.
  if (path.startsWith("/partner")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (token.role !== "PARTNER_ADMIN") {
      return NextResponse.redirect(new URL(homeForRole(token.role), req.url));
    }
  }

  if (path.startsWith("/lecturer")) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (token.role !== "LECTURER") {
      return NextResponse.redirect(new URL(homeForRole(token.role), req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/partner/:path*",
    "/lecturer/:path*",
    "/api/auth/:path*",
    "/dashboard/:path*",
    "/register",
    "/login",
    "/pricing",
    "/verify-email",
    "/forgot-password",
    "/reset-password",
  ],
};
