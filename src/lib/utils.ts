type ClassValue = string | number | null | boolean | undefined;

export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(" ");
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/** Format an integer cents amount as a localized currency string. */
export function formatCurrencyCents(cents: number, currency = "GBP"): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format((cents ?? 0) / 100);
  } catch {
    return `${((cents ?? 0) / 100).toFixed(2)} ${currency}`;
  }
}

/** Shared class for native select/textarea elements outside the Input component. */
export const formControlClass =
  "w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm text-ink-900 transition-all duration-200 hover:border-slate-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
