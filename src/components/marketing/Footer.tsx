export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-slate-500">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
              IA
            </div>
            <span className="font-semibold text-ink-900">InsightApex</span>
          </div>
          <p>© {new Date().getFullYear()} InsightApex. Built for ACCA students worldwide.</p>
        </div>
      </div>
    </footer>
  );
}
