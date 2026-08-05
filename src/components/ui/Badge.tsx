import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200/60",
  accent: "bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-200/60",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/60",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200/60",
  danger: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200/60",
  neutral: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200/60",
  premium: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800 ring-1 ring-inset ring-amber-200/60",
};

interface BadgeProps {
  tone?: keyof typeof tones;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ tone = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
