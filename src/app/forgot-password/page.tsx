"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/marketing/AuthLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Alert } from "@/components/ui/Alert";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Could not send reset email.");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a reset link.">
      {sent ? (
        <div className="space-y-4">
          <Alert tone="success" title="Check your inbox">
            If an account exists for that email, a reset link is on its way. The link expires in 1
            hour.
          </Alert>
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Back to login
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            disabled={loading}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && <Alert tone="error">{error}</Alert>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Spinner className="h-4 w-4" />}
            {loading ? "Sending..." : "Send reset link"}
          </Button>
          <p className="text-center text-sm text-slate-500">
            <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
              Back to login
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
