"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
  sectionId?: string;
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: "▦", exact: true },
  { href: "/dashboard/quiz", label: "Practice", icon: "✎" },
  { href: "/dashboard/mock-exams", label: "Mock Exams", icon: "📝" },
  { href: "/dashboard", label: "Progress", icon: "📈", sectionId: "progress" },
  { href: "/dashboard", label: "Weak Topics", icon: "🎯", sectionId: "weak-topics" },
  { href: "/dashboard/bookmarks", label: "Bookmarks", icon: "🔖" },
  { href: "/dashboard/profile", label: "Profile", icon: "◎" },
];

interface DashboardSidebarProps {
  userName: string;
  mobileOpen?: boolean;
  onClose?: () => void;
}

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function DashboardSidebar({ userName, mobileOpen, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeHash, setActiveHash] = useState("");

  useEffect(() => {
    const syncHash = () => setActiveHash(window.location.hash.replace("#", ""));
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  function isActive(item: NavItem) {
    if (item.sectionId) {
      return pathname === "/dashboard" && activeHash === item.sectionId;
    }
    if (item.exact && item.href === "/dashboard") {
      return pathname === "/dashboard" && !activeHash;
    }
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  function handleSectionNav(sectionId: string) {
    onClose?.();
    setActiveHash(sectionId);
    if (pathname === "/dashboard") {
      scrollToSection(sectionId);
      window.history.replaceState(null, "", `/dashboard#${sectionId}`);
      return;
    }
    router.push(`/dashboard#${sectionId}`);
  }

  function handleOverviewClick() {
    onClose?.();
    setActiveHash("");
    if (pathname === "/dashboard") {
      window.history.replaceState(null, "", "/dashboard");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function renderNavItem(item: NavItem) {
    const className = cn(
      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
      isActive(item)
        ? "bg-brand-50 text-brand-700"
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    );

    if (item.sectionId) {
      return (
        <button key={item.label} type="button" onClick={() => handleSectionNav(item.sectionId!)} className={className}>
          <span className="flex h-7 w-7 items-center justify-center text-base">{item.icon}</span>
          {item.label}
        </button>
      );
    }

    return (
      <Link
        key={item.href + item.label}
        href={item.href}
        onClick={item.exact && item.href === "/dashboard" ? handleOverviewClick : onClose}
        className={className}
      >
        <span className="flex h-7 w-7 items-center justify-center text-base">{item.icon}</span>
        {item.label}
      </Link>
    );
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6",
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300",
          "lg:static lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-2" onClick={onClose}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-card">
            IA
          </div>
          <div className="min-w-0 leading-tight">
            <span className="block text-base font-semibold tracking-tight text-ink-900">InsightApex</span>
            <span className="block text-[10px] text-slate-500">ACCA Practice Platform</span>
          </div>
        </Link>

        <nav className="flex-1 space-y-0.5 overflow-y-auto">{nav.map(renderNavItem)}</nav>

        <div className="border-t border-slate-100 pt-4">
          <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Logged in as
          </div>
          <div className="truncate px-3 text-sm font-medium text-slate-700">{userName}</div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="mt-3 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <span className="flex h-7 w-7 items-center justify-center text-base">→</span>
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
