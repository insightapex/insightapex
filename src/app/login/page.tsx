"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/marketing/AuthLayout";
import { LoginRedirectOverlay } from "@/components/auth/LoginRedirectOverlay";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useLogin } from "@/hooks/useLogin";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const { login, error, redirectMessage, isLoading, isRedirecting, needsEmailVerification } = useLogin();
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResendMessage(null);
    await login(form.email, form.password);
  }

  async function handleResendVerification() {
    if (!form.email) {
      setResendMessage("Enter your email address above first.");
      return;
    }
    setResendLoading(true);
    setResendMessage(null);
    try {
      const res = await fetch("/api/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResendMessage(data.error ?? "Could not send verification email.");
        return;
      }
      setResendMessage(data.message ?? "Verification email sent. Check your inbox.");
    } catch {
      setResendMessage("Something went wrong. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to continue your ACCA prep.">
      <div className="relative">
        {isRedirecting && redirectMessage && <LoginRedirectOverlay message={redirectMessage} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            disabled={isLoading}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            disabled={isLoading}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Forgot password?
            </Link>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {needsEmailVerification && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p>
                Resetting your password does <strong>not</strong> verify your email. You must click the verification
                link sent when you registered.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                disabled={resendLoading}
                onClick={handleResendVerification}
              >
                {resendLoading && <Spinner className="h-4 w-4" />}
                Resend verification email
              </Button>
            </div>
          )}
          {resendMessage && <p className="text-sm text-brand-700">{resendMessage}</p>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Spinner className="h-4 w-4" />}
            {isLoading ? "Signing in..." : "Log in"}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-brand-600 hover:text-brand-700">
          Register
        </Link>
      </p>
      {process.env.NODE_ENV !== "production" && (
        <p className="mt-2 text-center text-xs text-slate-400">
          Demo: student@insightapex.com / Student@12345
        </p>
      )}
    </AuthLayout>
  );
}
