"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Dashboard", icon: "▦", exact: true },
  { href: "/admin/questions", label: "Questions", icon: "✎" },
  { href: "/admin/papers", label: "Papers", icon: "☰" },
  { href: "/admin/topics", label: "Topics", icon: "◈" },
  { href: "/admin/mock-exams", label: "Mock Exams", icon: "⏱" },
  { href: "/admin/students", label: "Students", icon: "◎" },
  { href: "/admin/results", label: "Results", icon: "✓" },
  { href: "/admin/analytics", label: "Analytics", icon: "↗" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
];

interface AdminSidebarProps {
  userName?: string;
}

export function AdminSidebar({ userName }: AdminSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-ink-900">
      <div className="px-4 py-6">
        <Link href="/admin" className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white shadow-lg shadow-brand-500/30">
            IA
          </div>
          <div>
            <div className="text-sm font-semibold text-white">InsightApex</div>
            <div className="text-xs text-slate-400">Admin / Tutor Portal</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Manage
        </p>
        {nav.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-600 text-white shadow-md shadow-brand-600/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <span className="w-5 text-center text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        {userName && (
          <div className="mb-3 px-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Signed in</p>
            <p className="mt-1 truncate text-sm font-medium text-slate-300">{userName}</p>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-900/30 hover:text-red-400"
        >
          <span className="w-5 text-center">→</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
