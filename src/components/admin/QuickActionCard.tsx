import Link from "next/link";
import { cn } from "@/lib/utils";

interface QuickActionCardProps {
  href: string;
  label: string;
  description: string;
  icon: string;
  accent?: "brand" | "emerald" | "violet" | "amber" | "rose";
}

const accents = {
  brand: "hover:border-brand-300 hover:bg-brand-50/50 group-hover:text-brand-600",
  emerald: "hover:border-emerald-300 hover:bg-emerald-50/50 group-hover:text-emerald-600",
  violet: "hover:border-violet-300 hover:bg-violet-50/50 group-hover:text-violet-600",
  amber: "hover:border-amber-300 hover:bg-amber-50/50 group-hover:text-amber-600",
  rose: "hover:border-rose-300 hover:bg-rose-50/50 group-hover:text-rose-600",
};

export function QuickActionCard({ href, label, description, icon, accent = "brand" }: QuickActionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col rounded-xl2 border border-slate-200 bg-white p-4 shadow-card transition-all",
        accents[accent]
      )}
    >
      <span className="text-2xl">{icon}</span>
      <span className="mt-3 text-sm font-semibold text-ink-900">{label}</span>
      <span className="mt-0.5 text-xs text-slate-500">{description}</span>
    </Link>
  );
}
