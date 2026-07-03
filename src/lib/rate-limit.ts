/**
 * Simple in-memory rate limiter for auth endpoints.
 * Suitable for single-instance deployments; resets on server restart.
 */

type RateLimitEntry = { count: number; resetAt: number };

const store = new Map<string, RateLimitEntry>();

export type RateLimitConfig = {
  limit: number;
  windowMs: number;
};

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  if (entry.count >= config.limit) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return req.headers.get("x-real-ip") ?? "unknown";
}

export const AUTH_RATE_LIMIT: RateLimitConfig = {
  limit: 10,
  windowMs: 15 * 60 * 1000,
};

export function rateLimitResponse(retryAfterSec: number) {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    }
  );
}
