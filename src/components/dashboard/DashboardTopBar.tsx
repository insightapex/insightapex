"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { IconBell, IconChevronDown } from "@/components/dashboard/DashboardIcons";

interface DashboardTopBarProps {
  userName: string;
  onMenuOpen?: () => void;
  showMenuButton?: boolean;
}

export function DashboardTopBar({ userName, onMenuOpen, showMenuButton }: DashboardTopBarProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const firstName = userName.split(" ")[0];
  const initial = firstName.charAt(0).toUpperCase();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-slate-200/80 bg-white px-4 py-3 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <button
            type="button"
            onClick={onMenuOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 lg:hidden"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
          aria-label="Notifications"
        >
          <IconBell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 transition-colors hover:bg-slate-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-semibold text-white">
              {initial}
            </span>
            <span className="hidden text-sm font-medium text-slate-700 sm:block">{firstName}</span>
            <IconChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
          </button>

          {open && (
            <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-panel">
              <div className="border-b border-slate-100 px-4 py-2.5">
                <p className="truncate text-sm font-medium text-slate-800">{userName}</p>
              </div>
              <Link
                href="/dashboard/profile"
                className="block px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
