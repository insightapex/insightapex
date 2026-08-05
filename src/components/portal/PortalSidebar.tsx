"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Avatar } from "@/components/ui/Avatar";
import { PortalIcon } from "@/components/portal/PortalIcons";
import {
  PORTAL_SIDEBAR_COLLAPSED,
  PORTAL_SIDEBAR_WIDTH,
  portalAccentStyles,
  type PortalNavGroup,
  type PortalAccent,
} from "@/components/portal/types";
import { cn } from "@/lib/utils";

interface PortalSidebarProps {
  accent: PortalAccent;
  homeHref: string;
  portalLabel: string;
  userName: string;
  userRoleLabel: string;
  navGroups: PortalNavGroup[];
  brandExtra?: React.ReactNode;
  collapsed?: boolean;
  mobileOpen?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}

export function PortalSidebar({
  accent,
  homeHref,
  portalLabel,
  userName,
  userRoleLabel,
  navGroups,
  brandExtra,
  collapsed = false,
  mobileOpen = false,
  onClose,
  onToggleCollapse,
}: PortalSidebarProps) {
  const pathname = usePathname();
  const styles = portalAccentStyles[accent];

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const content = (compact: boolean) => (
    <div className="flex h-full flex-col">
      <div className={cn("px-4 pt-5", compact && "px-3")}>
        <Link
          href={homeHref}
          onClick={onClose}
          className={cn("flex items-center gap-3", compact && "justify-center")}
        >
          {accent === "lecturer" || accent === "partner" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/brand/insightapex-logo.png"
              alt="InsightApex"
              className={cn(
                "shrink-0 object-contain object-top",
                compact ? "h-9 w-9" : "h-10 w-10"
              )}
            />
          ) : (
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm",
                styles.logo
              )}
            >
              IA
            </div>
          )}
          {!compact && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-slate-900">
                InsightApex
              </p>
              <p className={cn("text-[10px] font-semibold uppercase tracking-[0.14em]", styles.badge)}>
                {portalLabel}
              </p>
            </div>
          )}
        </Link>
        {!compact && brandExtra}
      </div>

      <nav className={cn("mt-6 flex-1 space-y-6 overflow-y-auto px-3 pb-4", compact && "px-2")}>
        {navGroups.map((group) => (
          <div key={group.label}>
            {!compact && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = isActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    title={compact ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      compact && "justify-center px-0",
                      active
                        ? styles.active
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <PortalIcon
                      name={item.icon}
                      className={cn(active ? styles.activeIcon : "text-slate-400")}
                    />
                    {!compact && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn("mt-auto border-t border-slate-200/80 p-3", compact && "px-2")}>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="mb-2 hidden w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 lg:flex"
            aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
          >
            <PortalIcon name={compact ? "expand" : "collapse"} />
            {!compact && <span>Collapse</span>}
          </button>
        )}

        <div
          className={cn(
            "rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3",
            compact && "flex flex-col items-center gap-2 p-2"
          )}
        >
          <div className={cn("flex items-center gap-3", compact && "justify-center")}>
            <Avatar name={userName} size="sm" />
            {!compact && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{userName}</p>
                <p className="truncate text-xs text-slate-500">{userRoleLabel}</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Sign out"
            className={cn(
              "mt-3 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-white hover:text-red-600",
              compact && "mt-0 justify-center px-0"
            )}
          >
            <PortalIcon name="logout" className="h-4 w-4" />
            {!compact && <span>Sign out</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Desktop / tablet collapsed rail */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 bg-white lg:flex lg:flex-col"
        style={{ width: collapsed ? PORTAL_SIDEBAR_COLLAPSED : PORTAL_SIDEBAR_WIDTH }}
      >
        {content(collapsed)}
      </aside>

      {/* Mobile / tablet drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(100%,280px)] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {content(false)}
      </aside>
    </>
  );
}
