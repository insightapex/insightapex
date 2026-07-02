import { requireStudent } from "@/lib/guards";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStudent();
  const userName = (user as { name?: string }).name ?? user.email ?? "Student";

  return <DashboardShell userName={userName}>{children}</DashboardShell>;
}
