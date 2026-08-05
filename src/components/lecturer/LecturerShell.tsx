"use client";

import { PortalShell } from "@/components/portal/PortalShell";
import type { PortalNavGroup } from "@/components/portal/types";
import type { ReactNode } from "react";

const lecturerNavGroups: PortalNavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/lecturer", label: "Dashboard", exact: true, icon: "dashboard" },
      { href: "/lecturer/at-risk-students", label: "At-Risk Students", icon: "results" },
      { href: "/lecturer/reports", label: "Reports", icon: "reports" },
    ],
  },
  {
    label: "Teaching",
    items: [
      { href: "/lecturer/papers", label: "Papers", icon: "papers" },
      { href: "/lecturer/mock-exams", label: "Mock Exams", icon: "mock" },
      { href: "/lecturer/questions", label: "Questions", icon: "questions" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/lecturer/students", label: "Students", icon: "students" },
      { href: "/lecturer/notifications", label: "Notifications", icon: "settings" },
    ],
  },
];

interface LecturerShellProps {
  schoolName: string;
  userName: string;
  children: ReactNode;
}

export function LecturerShell({ schoolName, userName, children }: LecturerShellProps) {
  return (
    <PortalShell
      accent="lecturer"
      homeHref="/lecturer"
      portalLabel="Lecturer Portal"
      userRoleLabel="Lecturer"
      headerLabel="Lecturer Portal"
      navGroups={lecturerNavGroups}
      userName={userName}
      brandExtra={
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            School
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{schoolName}</p>
        </div>
      }
      headerExtra={<p className="truncate text-sm font-semibold text-slate-900">{schoolName}</p>}
    >
      {children}
    </PortalShell>
  );
}
