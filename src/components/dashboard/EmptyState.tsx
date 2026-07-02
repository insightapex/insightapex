import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  compact?: boolean;
}

export function EmptyState({
  icon = "📋",
  title,
  description,
  actionLabel,
  actionHref,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "px-4 py-8" : "px-6 py-12"
      }`}
    >
      <div
        className={`mb-4 flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 text-2xl ${
          compact ? "h-12 w-12" : "h-14 w-14"
        }`}
      >
        {icon}
      </div>
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="mt-5">
          <Button size="sm">{actionLabel}</Button>
        </Link>
      )}
    </div>
  );
}
