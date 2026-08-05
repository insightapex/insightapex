import { getCurrentUser } from "@/lib/guards";
import { AdminShell } from "@/components/admin/AdminShell";
import { isContentAdmin, isOwner, isPlatformStaff } from "@/lib/roles";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
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
