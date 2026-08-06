import type { Role } from "@prisma/client";

/** Platform owner (full access). Formerly ADMIN / Super Admin. */
export function isOwner(role: Role | string | undefined | null): boolean {
  return role === "OWNER";
}

/** @deprecated Use isOwner — kept for gradual migration of call sites. */
export function isSuperAdmin(role: Role | string | undefined | null): boolean {
  return isOwner(role);
}

export function isContentAdmin(role: Role | string | undefined | null): boolean {
  return role === "CONTENT_ADMIN";
}

/** Owner or Content Admin — may enter the /admin portal shell. */
export function isPlatformStaff(role: Role | string | undefined | null): boolean {
  return isOwner(role) || isContentAdmin(role);
}

export function isPartnerAdmin(role: Role | string | undefined | null): boolean {
  return role === "PARTNER_ADMIN";
}

export function isLecturer(role: Role | string | undefined | null): boolean {
  return role === "LECTURER";
}

export function isStudent(role: Role | string | undefined | null): boolean {
  return role === "STUDENT";
}

export function homePathForRole(role: Role | string | undefined | null): string {
  if (isOwner(role)) return "/admin";
  if (isContentAdmin(role)) return "/admin/questions";
  if (isPartnerAdmin(role)) return "/partner";
  if (isLecturer(role)) return "/lecturer";
  return "/dashboard";
}

/** Admin portal page paths Content Admins may open (exact prefix match). */
export const CONTENT_ADMIN_ALLOWED_PATH_PREFIXES = [
  "/admin/questions",
  "/admin/mock-exams",
] as const;

export function isContentAdminAllowedPath(pathname: string): boolean {
  return CONTENT_ADMIN_ALLOWED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
