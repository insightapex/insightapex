"use client";

import { useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardTopBar } from "@/components/dashboard/DashboardTopBar";

interface DashboardShellProps {
  userName: string;
  children: React.ReactNode;
}

export function DashboardShell({ userName, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f6fa]">
      <DashboardSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardTopBar
          userName={userName}
          showMenuButton
          onMenuOpen={() => setMobileOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
