"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LeavePending =
  | { kind: "href"; href: string }
  | { kind: "back" }
  | null;

/**
 * While enabled (mock exam in progress):
 * - Native browser prompt on tab close / refresh
 * - Browser Back is trapped and opens an in-app dialog
 * - In-app sidebar / link clicks to other routes open the same dialog
 *
 * Call `allowExit()` before intentional navigation after submit.
 */
export function useMockExamLeaveGuard(enabled: boolean) {
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [pending, setPending] = useState<LeavePending>(null);
  const allowExitRef = useRef(false);
  const trapArmedRef = useRef(false);

  const allowExit = useCallback(() => {
    allowExitRef.current = true;
  }, []);

  const openLeaveDialog = useCallback((next: LeavePending) => {
    if (allowExitRef.current || !enabled) return;
    setPending(next);
    setLeaveOpen(true);
  }, [enabled]);

  const dismissLeave = useCallback(() => {
    setLeaveOpen(false);
    setPending(null);
  }, []);

  // Tab close / refresh — browsers only allow a generic system dialog
  useEffect(() => {
    if (!enabled) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (allowExitRef.current) return;
      e.preventDefault();
      e.returnValue =
        "Your mock exam is still in progress. Your answers will be saved if you leave after confirming.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled]);

  // Browser Back trap
  useEffect(() => {
    if (!enabled) {
      trapArmedRef.current = false;
      return;
    }

    if (!trapArmedRef.current) {
      window.history.pushState({ mockExamGuard: true }, "", window.location.href);
      trapArmedRef.current = true;
    }

    const onPopState = () => {
      if (allowExitRef.current) return;
      // Re-arm so they stay on the session URL
      window.history.pushState({ mockExamGuard: true }, "", window.location.href);
      openLeaveDialog({ kind: "back" });
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [enabled, openLeaveDialog]);

  // Intercept same-tab in-app / external link navigations
  useEffect(() => {
    if (!enabled) return;

    const onClick = (e: MouseEvent) => {
      if (allowExitRef.current) return;
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const hrefAttr = anchor.getAttribute("href");
      if (!hrefAttr || hrefAttr.startsWith("javascript:")) return;
      if (hrefAttr.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(hrefAttr, window.location.href);
      } catch {
        return;
      }

      // Ignore same route (same path + query) — only true navigations away
      if (
        url.origin === window.location.origin &&
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      openLeaveDialog({ kind: "href", href: url.href });
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [enabled, openLeaveDialog]);

  return {
    leaveOpen,
    pending,
    allowExit,
    dismissLeave,
    openLeaveDialog,
  };
}
