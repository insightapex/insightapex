import { ReactNode } from "react";

type StatTone = "blue" | "green" | "purple" | "amber" | "red" | "orange";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  tone?: StatTone;
  trend?: { value: number; label: string } | null;
  sub?: string;
}

const tones: Record<StatTone, { icon: string; trend: string }> = {
  blue: { icon: "bg-blue-50 text-blue-600", trend: "text-emerald-600" },
  green: { icon: "bg-emerald-50 text-emerald-600", trend: "text-emerald-600" },
  purple: { icon: "bg-violet-50 text-violet-600", trend: "text-emerald-600" },
  amber: { icon: "bg-amber-50 text-amber-600", trend: "text-emerald-600" },
  red: { icon: "bg-red-50 text-red-600", trend: "text-amber-600" },
  orange: { icon: "bg-orange-50 text-orange-600", trend: "text-emerald-600" },
};

export function StatCard({ label, value, icon, tone = "blue", trend, sub }: StatCardProps) {
  const styles = tones[tone];

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card transition-shadow hover:shadow-panel sm:p-5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-ink-900">{value}</p>
        {trend && (
          <p className={`mt-0.5 text-xs font-medium ${styles.trend}`}>
            {trend.value >= 0 ? "+" : ""}
            {trend.value}% {trend.label}
          </p>
        )}
        {!trend && sub && <p className="mt-0.5 text-xs font-medium text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}
