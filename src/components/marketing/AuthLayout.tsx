import Link from "next/link";

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-surface" />
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-brand-200/30 blur-3xl" />

      <div className="relative w-full max-w-md animate-slide-up">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand text-sm font-bold text-white shadow-glow">
            IA
          </div>
          <span className="text-xl font-bold tracking-tight text-ink-900">InsightApex</span>
        </Link>
        <div className="rounded-2xl border border-slate-200/60 bg-white/90 p-8 shadow-float backdrop-blur-xl">
          <h1 className="text-xl font-bold text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
