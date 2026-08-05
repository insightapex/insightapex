"use client";

import { useState } from "react";
import Link from "next/link";
import { LoginRedirectOverlay } from "@/components/auth/LoginRedirectOverlay";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useLogin } from "@/hooks/useLogin";
import { cn } from "@/lib/utils";

function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5l8.4 5.6a1.5 1.5 0 001.6 0L21.4 7.5M5.25 18h13.5A1.75 1.75 0 0020.5 16.25v-8.5A1.75 1.75 0 0018.75 6H5.25A1.75 1.75 0 003.5 7.75v8.5A1.75 1.75 0 005.25 18z" />
    </svg>
  );
}

function IconLock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 10.5V8.25a4.5 4.5 0 019 0v2.25M6.75 10.5h10.5A1.75 1.75 0 0119 12.25v6A1.75 1.75 0 0117.25 20H6.75A1.75 1.75 0 015 18.25v-6a1.75 1.75 0 011.75-1.75z" />
    </svg>
  );
}

function IconEye({ className, open }: { className?: string; open: boolean }) {
  if (open) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 12s3.5-6.5 8.5-6.5S20.5 12 20.5 12s-3.5 6.5-8.5 6.5S3.5 12 3.5 12z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 12s3.5-6.5 8.5-6.5S20.5 12 20.5 12s-3.5 6.5-8.5 6.5S3.5 12 3.5 12z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20L20 4" />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5h15M7 16v-4.5M12 16V8M17 16v-7" />
    </svg>
  );
}

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-1.5 3.5-5.1 3.5-3.1 0-5.6-2.5-5.6-5.6S8.9 6.1 12 6.1c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.8 3.7 14.6 2.7 12 2.7 6.9 2.7 2.7 6.9 2.7 12S6.9 21.3 12 21.3c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z" />
      <path fill="#34A853" d="M3.9 7.4l3 2.2C7.8 7.5 9.7 6.1 12 6.1c1.8 0 3 .7 3.7 1.4l2.5-2.4C16.8 3.7 14.6 2.7 12 2.7 8.4 2.7 5.3 4.7 3.9 7.4z" />
      <path fill="#4A90E2" d="M12 21.3c2.5 0 4.6-.8 6.1-2.2l-2.9-2.3c-.8.6-1.9 1-3.2 1-3.5 0-6.4-2.3-7.4-5.5l-3 2.3C3.1 18.7 7.1 21.3 12 21.3z" />
      <path fill="#FBBC05" d="M4.6 14.3c-.3-.8-.4-1.6-.4-2.3 0-.8.1-1.6.4-2.3l-3-2.3C1.3 8.8 1 10.3 1 12s.3 3.2.9 4.6l2.7-2.3z" />
    </svg>
  );
}

const STATS = [
  { value: "87%", label: "First-attempt pass rate" },
  { value: "9", label: "ACCA papers covered" },
  { value: "40k+", label: "Practice questions" },
] as const;

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [googleNote, setGoogleNote] = useState<string | null>(null);
  const { login, error, redirectMessage, isLoading, isRedirecting, needsEmailVerification } =
    useLogin();
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResendMessage(null);
    setGoogleNote(null);
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
    <div className="relative flex min-h-screen bg-white">
      {/* Left — brand panel */}
      <aside className="relative hidden w-[35%] overflow-hidden lg:flex lg:flex-col lg:justify-between lg:bg-[#0c1f4d]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-32deg, transparent, transparent 14px, rgba(255,255,255,0.35) 14px, rgba(255,255,255,0.35) 15px)",
          }}
        />
        <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-sky-400/15 blur-3xl" />

        <div className="relative flex h-full flex-col justify-between px-10 py-10 xl:px-14 xl:py-12">
          <Link href="/" className="text-xl font-bold tracking-tight text-white">
            InsightApex
          </Link>

          <div className="max-w-md animate-fade-in">
            <div className="mb-8 inline-flex rounded-2xl border border-white/20 bg-white p-4 shadow-[0_0_40px_rgba(59,130,246,0.25)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/insightapex-logo.png"
                alt="Insight Apex — Master today. Lead tomorrow."
                className="h-auto w-[11.5rem] object-contain sm:w-[13rem]"
              />
            </div>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
              Master today.
              <br />
              Lead tomorrow.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-blue-100/85 xl:text-[15px]">
              Structured ACCA prep with mock exams, syllabus tracking, and daily practice built for
              the students who show up consistently.
            </p>
          </div>

          <div>
            <div className="grid grid-cols-3 gap-4 border-t border-white/15 pt-6">
              {STATS.map((stat) => (
                <div key={stat.label}>
                  <IconChart className="mb-2 h-4 w-4 text-sky-300" />
                  <p className="text-xl font-bold text-white xl:text-2xl">{stat.value}</p>
                  <p className="mt-1 text-[11px] leading-snug text-blue-100/70">{stat.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-[10px] font-medium uppercase tracking-[0.22em] text-blue-200/50">
              InsightApex · ACCA Exam Preparation
            </p>
          </div>
        </div>
      </aside>

      {/* Right — form */}
      <main className="relative flex w-full flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:w-[65%]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(59,130,246,0.06),_transparent_55%)]" />

        <div className="relative w-full max-w-[26rem] animate-slide-up">
          {isRedirecting && redirectMessage && (
            <LoginRedirectOverlay message={redirectMessage} />
          )}

          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">
            <span className="h-px w-4 bg-brand-500" aria-hidden />
            Student login
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-500">Log in to continue today&apos;s study session.</p>

          {/* Mobile brand cue */}
          <Link href="/" className="mt-5 inline-flex items-center gap-2.5 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/insightapex-logo.png"
              alt="Insight Apex"
              className="h-14 w-auto object-contain"
            />
          </Link>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
              <span className="relative block">
                <IconMail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={cn(
                    "h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3.5 text-sm text-ink-900",
                    "placeholder:text-slate-400 transition-colors",
                    "hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
                    "disabled:opacity-60"
                  )}
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Password</span>
              <span className="relative block">
                <IconLock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={cn(
                    "h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-11 text-sm text-ink-900",
                    "placeholder:text-slate-400 transition-colors",
                    "hover:border-slate-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
                    "disabled:opacity-60"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <IconEye className="h-4 w-4" open={showPassword} />
                </button>
              </span>
            </label>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Forgot password?
              </Link>
            </div>

            {error && <Alert tone="error">{error}</Alert>}

            {needsEmailVerification && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p>
                  Resetting your password does <strong>not</strong> verify your email. You must click
                  the verification link sent when you registered.
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
            {googleNote && <p className="text-sm text-slate-500">{googleNote}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 text-sm font-semibold text-white",
                "shadow-[0_8px_20px_rgba(36,86,245,0.35)] transition-all",
                "hover:bg-brand-700 hover:shadow-[0_10px_24px_rgba(36,86,245,0.4)] active:scale-[0.99]",
                "disabled:cursor-not-allowed disabled:opacity-70"
              )}
            >
              {isLoading && <Spinner className="h-4 w-4 text-white" />}
              {isLoading ? "Signing in…" : "Log in"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            onClick={() =>
              setGoogleNote("Google sign-in is not enabled yet. Use email and password for now.")
            }
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <GoogleMark className="h-5 w-5" />
            Continue with Google
          </button>

          {process.env.NODE_ENV !== "production" && (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-brand-100 bg-brand-50/80 px-3.5 py-3 text-sm text-brand-800">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                i
              </span>
              <p>
                Demo access —{" "}
                <span className="font-medium">student@insightapex.com / Student@12345</span>
              </p>
            </div>
          )}

          <p className="mt-8 text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
              Register
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
