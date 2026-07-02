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
  const { login, error, redirectMessage, isLoading, isRedirecting } = useLogin();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await login(form.email, form.password);
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
      <p className="mt-2 text-center text-xs text-slate-400">
        Demo: student@insightapex.com / Student@12345
      </p>
    </AuthLayout>
  );
}
