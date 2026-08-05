"use client";

export type TrendRange = "1m" | "3m" | "6m";

const OPTIONS: { id: TrendRange; label: string }[] = [
  { id: "1m", label: "This Month" },
  { id: "3m", label: "Last 3 Months" },
  { id: "6m", label: "Last 6 Months" },
];

export function RangeFilter({
  value,
  onChange,
}: {
  value: TrendRange;
  onChange: (range: TrendRange) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">Duration</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as TrendRange)}
        className="h-9 min-w-[10.5rem] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition-colors hover:border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        aria-label="Select duration"
      >
        {OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
