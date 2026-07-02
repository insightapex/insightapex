interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "success" | "warning" | "brand";
  icon?: string;
}

const valueTones = {
  default: "text-ink-900",
  success: "text-emerald-600",
  warning: "text-amber-600",
  brand: "text-brand-600",
};

const iconBg = {
  default: "bg-slate-100 text-slate-600",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  brand: "bg-brand-50 text-brand-600",
};

export function StatCard({ label, value, sub, tone = "default", icon }: StatCardProps) {
  return (
    <div className="group rounded-xl2 border border-slate-200/80 bg-white p-5 shadow-card transition-shadow hover:shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        {icon && (
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ${iconBg[tone]}`}
          >
            {icon}
          </span>
        )}
      </div>
      <p className={`mt-3 text-3xl font-bold tracking-tight ${valueTones[tone]}`}>{value}</p>
      {sub && <p className="mt-1.5 text-sm text-slate-500">{sub}</p>}
    </div>
  );
}
