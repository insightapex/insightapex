"use client";

import { cn } from "@/lib/utils";
import { usePortalAccent } from "@/components/portal/PortalTheme";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  const accent = usePortalAccent();
  const countActive =
    accent === "partner"
      ? "bg-emerald-50 text-emerald-700"
      : accent === "lecturer"
        ? "bg-sky-50 text-sky-700"
        : "bg-brand-50 text-brand-600";

  return (
    <div className={cn("flex gap-1 rounded-xl border border-slate-200/80 bg-slate-50/80 p-1", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
            active === tab.id
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                active === tab.id ? countActive : "bg-slate-200/60 text-slate-500"
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
