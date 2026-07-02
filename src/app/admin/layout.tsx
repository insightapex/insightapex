import { getCurrentUser } from "@/lib/guards";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const isAdmin = user && (user as { role?: string }).role === "ADMIN";

  if (!isAdmin) {
    return <>{children}</>;
  }

  const userName = (user as { name?: string }).name ?? user.email ?? "Admin";

  return (
    <div className="flex h-screen overflow-hidden bg-[#eef1f6]">
      <AdminSidebar userName={userName} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
