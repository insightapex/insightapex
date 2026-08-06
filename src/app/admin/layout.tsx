import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/guards";
import { AdminShell } from "@/components/admin/AdminShell";
import { isContentAdmin, isOwner, isPlatformStaff } from "@/lib/roles";

/**
 * Owner / Content Admin segment layout.
 *
 * - /admin/login is flagged by middleware (`x-admin-auth-page`) and must NEVER
 *   receive the authenticated AdminShell (that caused shell + "Redirecting..." loop).
 * - Protected portal pages wrap in AdminShell only when session is platform staff.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const headerStore = headers();
  const isAuthPage = headerStore.get("x-admin-auth-page") === "1";

  if (isAuthPage) {
    return <>{children}</>;
  }

  const user = await getCurrentUser();

  // Unauthenticated users on protected /admin/* are redirected by middleware;
  // still avoid shell if session is missing or non-staff.
  if (!user || !isPlatformStaff(user.role)) {
    return <>{children}</>;
  }

  const role = isOwner(user.role) ? "OWNER" : isContentAdmin(user.role) ? "CONTENT_ADMIN" : "OWNER";
  const userName = user.name ?? user.email ?? (role === "OWNER" ? "Owner" : "Content Admin");

  return (
    <AdminShell userName={userName} role={role}>
      {children}
    </AdminShell>
  );
}
