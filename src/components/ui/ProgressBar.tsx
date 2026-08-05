import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  tone?: "brand" | "accent" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  label?: string;
  showValue?: boolean;
  className?: string;
}

const barColors: Record<string, string> = {
  brand: "bg-gradient-to-r from-brand-500 to-brand-600",
  accent: "bg-gradient-to-r from-accent-500 to-brand-500",
  success: "bg-gradient-to-r from-emerald-400 to-emerald-500",
  warning: "bg-gradient-to-r from-amber-400 to-amber-500",
  danger: "bg-gradient-to-r from-red-400 to-red-500",
};

const sizes: Record<string, string> = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3",
};

export function ProgressBar({
  value,
  tone = "brand",
  size = "md",
  label,
  showValue,
  className,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label && <span className="font-medium text-slate-500">{label}</span>}
          {showValue && <span className="font-semibold text-slate-700">{Math.round(clamped)}%</span>}
        </div>
      )}
      <div className={cn("w-full overflow-hidden rounded-full bg-slate-100", sizes[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", barColors[tone])}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
