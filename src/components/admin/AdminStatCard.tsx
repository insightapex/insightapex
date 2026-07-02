import { cn } from "@/lib/utils";

interface AdminStatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  accent?: "brand" | "emerald" | "amber" | "rose" | "violet" | "slate";
}

const accents = {
  brand: "from-brand-500/10 to-brand-600/5 border-brand-200/60 text-brand-600",
  emerald: "from-emerald-500/10 to-emerald-600/5 border-emerald-200/60 text-emerald-600",
  amber: "from-amber-500/10 to-amber-600/5 border-amber-200/60 text-amber-600",
  rose: "from-rose-500/10 to-rose-600/5 border-rose-200/60 text-rose-600",
  violet: "from-violet-500/10 to-violet-600/5 border-violet-200/60 text-violet-600",
  slate: "from-slate-500/10 to-slate-600/5 border-slate-200/60 text-slate-600",
};

export function AdminStatCard({ label, value, sub, icon, accent = "brand" }: AdminStatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl2 border bg-gradient-to-br p-5 shadow-card",
        accents[accent]
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold text-ink-900 sm:text-3xl">{value}</p>
          {sub && <p className="mt-1 truncate text-sm text-slate-500">{sub}</p>}
        </div>
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-lg shadow-sm">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
