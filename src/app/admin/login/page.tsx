"use client";

import { useState } from "react";
import { LoginRedirectOverlay } from "@/components/auth/LoginRedirectOverlay";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useLogin } from "@/hooks/useLogin";

export default function AdminLoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const { login, error, redirectMessage, isLoading, isRedirecting } = useLogin({ adminOnly: true });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await login(form.email, form.password);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white">IA</div>
          <div>
            <span className="text-lg font-semibold text-white">InsightApex</span>
            <span className="block text-xs text-slate-400">Admin / Tutor Portal</span>
          </div>
        </div>

        <div className="relative rounded-xl2 border border-white/10 bg-white/5 p-8">
          {isRedirecting && redirectMessage && (
            <LoginRedirectOverlay message={redirectMessage} variant="dark" />
          )}

          <h1 className="text-xl font-semibold text-white">Sign in to admin</h1>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label="Email"
              type="email"
              required
              autoComplete="email"
              disabled={isLoading}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border-white/10 bg-white/10 text-white placeholder:text-slate-500 focus:border-brand-400"
            />
            <Input
              label="Password"
              type="password"
              required
              autoComplete="current-password"
              disabled={isLoading}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="border-white/10 bg-white/10 text-white placeholder:text-slate-500 focus:border-brand-400"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Spinner className="h-4 w-4" />}
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          {process.env.NODE_ENV !== "production" && (
            <p className="mt-4 text-xs text-slate-500">Demo: admin@insightapex.com / Admin@12345</p>
          )}
        </div>
      </div>
    </div>
  );
}
