"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/marketing/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Missing verification token.");
      return;
    }

    fetch("/api/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setError(data.error ?? "Verification failed.");
          return;
        }
        setStatus("success");
      })
      .catch(() => {
        setStatus("error");
        setError("Something went wrong. Please try again.");
      });
  }, [token]);

  if (status === "loading") {
    return (
      <AuthLayout title="Verifying your email" subtitle="Please wait...">
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      </AuthLayout>
    );
  }

  if (status === "error") {
    return (
      <AuthLayout title="Verification failed" subtitle={error ?? "This link is invalid or has expired."}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            The link may have expired (valid for 24 hours) or already been used. Try registering again or log in if
            you already verified.
          </p>
          <Link href="/register">
            <Button variant="outline" className="w-full">
              Create account
            </Button>
          </Link>
          <Link href="/login">
            <Button className="w-full">Go to login</Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Email verified" subtitle="Your account is ready. You can now log in and start practising.">
      <Link href="/login">
        <Button className="w-full">Log in</Button>
      </Link>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="Verifying your email" subtitle="Please wait...">
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6" />
          </div>
        </AuthLayout>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
