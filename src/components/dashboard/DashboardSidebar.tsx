"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconOverview,
  IconPractice,
  IconMockExam,
  IconProgress,
  IconWeakTopics,
  IconBookmarks,
  IconProfile,
} from "@/components/dashboard/DashboardIcons";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  exact?: boolean;
  sectionId?: string;
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: <IconOverview className="h-5 w-5" />, exact: true },
  { href: "/dashboard/quiz", label: "Practice", icon: <IconPractice className="h-5 w-5" /> },
  { href: "/dashboard/mock-exams", label: "Mock Exams", icon: <IconMockExam className="h-5 w-5" /> },
  { href: "/dashboard/pricing", label: "Pricing", icon: <IconProgress className="h-5 w-5" /> },
  { href: "/dashboard/billing", label: "Billing", icon: <IconBookmarks className="h-5 w-5" /> },
  { href: "/dashboard", label: "Progress", icon: <IconProgress className="h-5 w-5" />, sectionId: "progress" },
  { href: "/dashboard", label: "Weak Topics", icon: <IconWeakTopics className="h-5 w-5" />, sectionId: "weak-topics" },
  { href: "/dashboard/bookmarks", label: "Bookmarks", icon: <IconBookmarks className="h-5 w-5" /> },
  { href: "/dashboard/profile", label: "Profile", icon: <IconProfile className="h-5 w-5" /> },
];

interface DashboardSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

function scrollToSection(sectionId: string) {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function DashboardSidebar({ mobileOpen, onClose }: DashboardSidebarProps) {
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
    if (item.sectionId) return pathname === "/dashboard" && activeHash === item.sectionId;
    if (item.exact && item.href === "/dashboard") return pathname === "/dashboard" && !activeHash;
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
          {item.icon}
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
        {item.icon}
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
          "flex h-screen w-[260px] shrink-0 flex-col border-r border-slate-200/80 bg-white px-4 py-6",
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300",
          "lg:static lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2" onClick={onClose}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-card">
            IA
          </div>
          <span className="text-lg font-semibold tracking-tight text-ink-900">InsightApex</span>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto">{nav.map(renderNavItem)}</nav>

        <div className="mt-4 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">💎</span>
            <p className="text-sm font-semibold text-ink-900">Go Premium</p>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            Unlock advanced analytics and exclusive practice content.
          </p>
        <Link href="/dashboard/pricing" className="mt-3 inline-block w-full" onClick={onClose}>
          <span className="inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700">
            View plans →
          </span>
        </Link>
        </div>
      </aside>
    </>
  );
}
