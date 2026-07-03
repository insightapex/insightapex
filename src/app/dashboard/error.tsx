"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl">⚠️</div>
      <h2 className="mt-6 text-xl font-semibold text-ink-900">Something went wrong</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500">
        We hit an unexpected error loading this page. Please try again or return to your dashboard.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
