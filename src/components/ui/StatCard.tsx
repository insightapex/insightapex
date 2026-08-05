import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatTone = "brand" | "accent" | "success" | "warning" | "danger" | "neutral";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  tone?: StatTone;
  trend?: { value: number; label: string } | null;
  sub?: string;
  className?: string;
}

const tones: Record<StatTone, { icon: string; trend: string }> = {
  brand: { icon: "bg-brand-50 text-brand-600", trend: "text-emerald-600" },
  accent: { icon: "bg-accent-50 text-accent-600", trend: "text-emerald-600" },
  success: { icon: "bg-emerald-50 text-emerald-600", trend: "text-emerald-600" },
  warning: { icon: "bg-amber-50 text-amber-600", trend: "text-emerald-600" },
  danger: { icon: "bg-red-50 text-red-600", trend: "text-amber-600" },
  neutral: { icon: "bg-slate-100 text-slate-600", trend: "text-emerald-600" },
};

export function StatCard({ label, value, icon, tone = "brand", trend, sub, className }: StatCardProps) {
  const styles = tones[tone];

  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5",
        className
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1.5 text-lg font-bold tracking-tight text-slate-900 sm:text-2xl">{value}</p>
          {trend && (
            <p className={cn("mt-1 text-xs font-medium", styles.trend)}>
              {trend.value >= 0 ? "+" : ""}
              {trend.value}% {trend.label}
            </p>
          )}
          {!trend && sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        {icon && (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base sm:h-10 sm:w-10",
              styles.icon
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
