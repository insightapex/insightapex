import type { ReactNode } from "react";

export type PortalAccent = "admin" | "partner" | "lecturer";

export type PortalNavItem = {
  href: string;
  label: string;
  exact?: boolean;
  icon: string;
};

export type PortalNavGroup = {
  label: string;
  items: PortalNavItem[];
};

export const PORTAL_SIDEBAR_WIDTH = 260;
export const PORTAL_SIDEBAR_COLLAPSED = 76;

export const portalAccentStyles: Record<
  PortalAccent,
  {
    logo: string;
    active: string;
    activeIcon: string;
    soft: string;
    ring: string;
    badge: string;
  }
> = {
  admin: {
    logo: "bg-brand-600 text-white",
    active: "bg-brand-50 text-brand-700",
    activeIcon: "text-brand-600",
    soft: "bg-brand-50 text-brand-600",
    ring: "focus-visible:ring-brand-500/30",
    badge: "text-brand-600",
  },
  partner: {
    logo: "bg-emerald-600 text-white",
    active: "bg-emerald-50 text-emerald-800",
    activeIcon: "text-emerald-600",
    soft: "bg-emerald-50 text-emerald-700",
    ring: "focus-visible:ring-emerald-500/30",
    badge: "text-emerald-700",
  },
  lecturer: {
    logo: "bg-sky-600 text-white",
    active: "bg-sky-50 text-sky-800",
    activeIcon: "text-sky-600",
    soft: "bg-sky-50 text-sky-700",
    ring: "focus-visible:ring-sky-500/30",
    badge: "text-sky-700",
  },
};

export type PortalShellConfig = {
  accent: PortalAccent;
  homeHref: string;
  portalLabel: string;
  userRoleLabel: string;
  headerLabel: string;
  navGroups: PortalNavGroup[];
  brandExtra?: ReactNode;
};
