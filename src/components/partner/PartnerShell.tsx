"use client";

import { PortalShell } from "@/components/portal/PortalShell";
import type { PortalNavGroup } from "@/components/portal/types";

const partnerNavGroups: PortalNavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/partner", label: "Dashboard", exact: true, icon: "dashboard" },
      { href: "/partner/analytics", label: "Analytics", icon: "analytics" },
      { href: "/partner/reports", label: "Reports", icon: "reports" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/partner/students", label: "Students", icon: "students" },
      { href: "/partner/classes", label: "Classes", icon: "classes" },
      { href: "/partner/lecturers", label: "Lecturers", icon: "lecturers" },
    ],
  },
  {
    label: "Organisation",
    items: [{ href: "/partner/settings", label: "Settings", icon: "settings" }],
  },
];

interface PartnerShellProps {
  partnerName: string;
  userName: string;
  children: React.ReactNode;
}

export function PartnerShell({ partnerName, userName, children }: PartnerShellProps) {
  return (
    <PortalShell
      accent="partner"
      homeHref="/partner"
      portalLabel="Partner Portal"
      userRoleLabel="Partner Admin"
      headerLabel="Partner Portal"
      navGroups={partnerNavGroups}
      userName={userName}
      brandExtra={
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Organisation
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{partnerName}</p>
        </div>
      }
      headerExtra={
        <p className="truncate text-sm font-semibold text-slate-900">{partnerName}</p>
      }
    >
      {children}
    </PortalShell>
  );
}
