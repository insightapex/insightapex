import { requireLecturer } from "@/lib/guards";
import { LecturerShell } from "@/components/lecturer/LecturerShell";
import { LecturerScopeProvider } from "@/components/lecturer/LecturerScope";

export default async function LecturerLayout({ children }: { children: React.ReactNode }) {
  const { user, partner } = await requireLecturer();
  const userName = user.name ?? user.email ?? "Lecturer";

  return (
    <LecturerShell schoolName={partner.name} userName={userName}>
      <LecturerScopeProvider>{children}</LecturerScopeProvider>
    </LecturerShell>
  );
}
