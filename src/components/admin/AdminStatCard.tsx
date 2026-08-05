import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PortalIcon } from "@/components/portal/PortalIcons";

type StatTone = "brand" | "accent" | "success" | "warning" | "danger" | "neutral";

interface AdminStatCardProps {
  label: string;
  value: string | number;
  /** Portal icon name (preferred) or custom node */
  icon?: string | ReactNode;
  tone?: StatTone;
  /** @deprecated use tone */
  accent?: string;
  sub?: string;
  className?: string;
}

const iconTone: Record<StatTone, string> = {
  brand: "bg-brand-50 text-brand-600",
  accent: "bg-violet-50 text-violet-600",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-rose-50 text-rose-600",
  neutral: "bg-slate-100 text-slate-600",
};

const accentMap: Record<string, StatTone> = {
  brand: "brand",
  violet: "accent",
  emerald: "success",
  amber: "warning",
  red: "danger",
  rose: "danger",
};

function renderIcon(icon: string | ReactNode) {
  if (typeof icon === "string") {
    return <PortalIcon name={icon} className="h-6 w-6" />;
  }
  return icon;
}

export function AdminStatCard({
  label,
  value,
  icon,
  tone,
  accent,
  sub,
  className,
}: AdminStatCardProps) {
  const resolvedTone = tone ?? (accent ? accentMap[accent] ?? "brand" : "brand");
  const valueText = String(value);

  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5",
        className
      )}
    >
      <div className="flex min-w-0 items-start gap-2 sm:gap-3">
        {icon != null && icon !== "" && (
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12",
              iconTone[resolvedTone]
            )}
          >
            {renderIcon(icon)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p
            className="mt-1.5 break-words text-lg font-bold tracking-tight text-slate-900 sm:text-2xl"
            title={valueText}
          >
            <span className="line-clamp-2">{valueText}</span>
          </p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
