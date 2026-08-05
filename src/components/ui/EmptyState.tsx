import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { PortalIcon } from "@/components/portal/PortalIcons";

interface EmptyStateProps {
  /** Portal icon name (preferred) or custom node */
  icon?: string | ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  compact?: boolean;
  className?: string;
}

function renderIcon(icon: string | ReactNode) {
  if (typeof icon === "string") {
    return <PortalIcon name={icon} className="h-7 w-7" />;
  }
  return icon;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  compact,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-8" : "px-6 py-14",
        className
      )}
    >
      {icon != null && icon !== "" && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand-soft text-brand-600">
          {renderIcon(icon)}
        </div>
      )}
      <h3 className="text-base font-semibold text-ink-900">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">{description}</p>
      )}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="mt-5">
          <Button variant="gradient" size="sm">
            {actionLabel}
          </Button>
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <Button variant="gradient" size="sm" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
