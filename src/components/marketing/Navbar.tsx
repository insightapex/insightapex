"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/40 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-sm font-bold text-white shadow-glow">
            IA
          </div>
          <span className="text-lg font-bold tracking-tight text-ink-900">InsightApex</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-500 md:flex">
          <a href="#features" className="transition-colors hover:text-ink-900">
            Features
          </a>
          <a href="#papers" className="transition-colors hover:text-ink-900">
            ACCA Papers
          </a>
          <a href="#how-it-works" className="transition-colors hover:text-ink-900">
            How it works
          </a>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/register">
            <Button variant="gradient" size="sm">
              Get started free
            </Button>
          </Link>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/60 text-slate-600 hover:bg-slate-50 md:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200/60 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1 text-sm font-medium text-slate-600">
            <a
              href="#features"
              className="rounded-lg px-3 py-2.5 hover:bg-slate-50"
              onClick={() => setMobileOpen(false)}
            >
              Features
            </a>
            <a
              href="#papers"
              className="rounded-lg px-3 py-2.5 hover:bg-slate-50"
              onClick={() => setMobileOpen(false)}
            >
              ACCA Papers
            </a>
            <a
              href="#how-it-works"
              className="rounded-lg px-3 py-2.5 hover:bg-slate-50"
              onClick={() => setMobileOpen(false)}
            >
              How it works
            </a>
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
            <Link href="/login" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" className="w-full">
                Log in
              </Button>
            </Link>
            <Link href="/register" onClick={() => setMobileOpen(false)}>
              <Button variant="gradient" className="w-full">
                Get started free
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
