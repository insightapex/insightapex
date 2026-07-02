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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 via-white to-white px-6 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            IA
          </div>
          <span className="text-lg font-semibold tracking-tight text-ink-900">InsightApex</span>
        </Link>
        <div className="rounded-xl2 border border-slate-200 bg-white p-8 shadow-panel">
          <h1 className="text-xl font-semibold text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
