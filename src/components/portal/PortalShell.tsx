"use client";

import { useEffect, useState } from "react";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { PortalIcon } from "@/components/portal/PortalIcons";
import {
  PORTAL_SIDEBAR_COLLAPSED,
  PORTAL_SIDEBAR_WIDTH,
  type PortalShellConfig,
} from "@/components/portal/types";

interface PortalShellProps extends PortalShellConfig {
  userName: string;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}

export function PortalShell({
  accent,
  homeHref,
  portalLabel,
  userRoleLabel,
  headerLabel,
  navGroups,
  brandExtra,
  userName,
  children,
  headerExtra,
}: PortalShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const desktopMq = window.matchMedia("(min-width: 1024px)");
    const tabletMq = window.matchMedia("(min-width: 1024px) and (max-width: 1279px)");

    const sync = () => {
      setIsDesktop(desktopMq.matches);
      if (tabletMq.matches) setCollapsed(true);
      if (desktopMq.matches && window.innerWidth >= 1280) setCollapsed(false);
    };

    sync();
    desktopMq.addEventListener("change", sync);
    tabletMq.addEventListener("change", sync);
    return () => {
      desktopMq.removeEventListener("change", sync);
      tabletMq.removeEventListener("change", sync);
    };
  }, []);

  const sidebarWidth = collapsed ? PORTAL_SIDEBAR_COLLAPSED : PORTAL_SIDEBAR_WIDTH;

  return (
    <div className="min-h-screen bg-slate-50">
      <PortalSidebar
        accent={accent}
        homeHref={homeHref}
        portalLabel={portalLabel}
        userName={userName}
        userRoleLabel={userRoleLabel}
        navGroups={navGroups}
        brandExtra={brandExtra}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onToggleCollapse={() => setCollapsed((v) => !v)}
      />

      <div
        className="relative flex min-h-screen min-w-0 flex-col transition-[padding-left] duration-300 ease-out"
        style={{ paddingLeft: isDesktop ? sidebarWidth : 0 }}
      >
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 lg:hidden"
            aria-label="Open menu"
          >
            <PortalIcon name="menu" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-500">{headerLabel}</p>
            {headerExtra}
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <div className="portal-page-container animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
