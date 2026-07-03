"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-900/30 text-2xl">⚠️</div>
      <h2 className="mt-6 text-xl font-semibold text-white">Admin panel error</h2>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        An unexpected error occurred. Try again or return to the admin dashboard.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => (window.location.href = "/admin")}>
          Go to admin home
        </Button>
      </div>
    </div>
  );
}
